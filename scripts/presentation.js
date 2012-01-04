(function() {
  var Presentation, Slide, build_types, n_slides_global, recursiveDoBuilds, recursiveUndoBuilds, refreshVisibility,
    __slice = Array.prototype.slice;

  n_slides_global = 0;

  recursiveDoBuilds = function(builds, cb) {
    var b;
    builds = builds.slice(0);
    if (builds.length === 0) {
      if (cb) cb();
      return;
    }
    b = builds.shift();
    return b["do"](function() {
      return recursiveDoBuilds(builds, cb);
    });
  };

  recursiveUndoBuilds = function(builds, cb, n) {
    var b, n_prime;
    if (n == null) n = void 0;
    if (n === void 0) n = builds.length;
    alert(n);
    if (n === 0) {
      if (cb) cb();
      return;
    }
    b = builds[n - 1];
    n_prime = n - 1;
    return b.undo(function() {
      return arguments.callee(builds, cb, n_prime);
    });
  };

  refreshVisibility = function(parent) {
    var includes;
    includes = $('.include', parent);
    return includes.each(function() {
      var local_parent;
      local_parent = $(this);
      return $('svg', local_parent).each(function() {
        var svg;
        svg = $(this).remove();
        return local_parent.append(svg);
      });
    });
  };

  build_types = {
    appear: function(target) {
      return {
        "do": function(cb) {
          return $(target).show(0, cb);
        },
        undo: function(cb) {
          return $(target).hide(0, cb);
        }
      };
    },
    disappear: function(target) {
      return {
        "do": function(cb) {
          return $(target).hide(0, cb);
        },
        undo: function(cb) {
          return $(target).show(0, cb);
        }
      };
    },
    fade_in: function(target, duration) {
      if (duration == null) duration = 'slow';
      return {
        "do": function(cb) {
          return $(target).animate({
            'opacity': 1.0
          }, duration, cb);
        },
        undo: function(cb) {
          return $(target).animate({
            'opacity': 0.0
          }, 0, cb);
        }
      };
    },
    fade_out: function(target, duration) {
      if (duration == null) duration = 'slow';
      return {
        "do": function(cb) {
          return $(target).animate({
            'opacity': 0.0
          }, duration, cb);
        },
        undo: function(cb) {
          return $(target).animate({
            'opacity': 1.0
          }, 0, cb);
        }
      };
    },
    opacity: function(target, op, duration) {
      if (duration == null) duration = 'slow';
      this.last_opacity;
      return {
        "do": function(cb) {
          var lo;
          this.last_opacity = $(target).css('opacity');
          lo = this.last_opacity;
          return $(target).animate({
            'opacity': op
          }, duration, cb);
        },
        undo: function(cb) {
          var lo;
          if (this.last_opacity !== void 0) {
            lo = this.last_opacity;
            return $(target).animate({
              'opacity': lo
            }, 0, cb);
          } else {
            if ($(target).css('opacity')) {
              this.last_opacity = $(target).css('opacity');
            }
            if (cb) return cb();
          }
        }
      };
    },
    play: function(target) {
      return {
        "do": function(cb) {
          try {
            $(target).get(0).play();
          } catch (_error) {}
          if (cb) return cb();
        },
        undo: function(cb) {
          try {
            $(target).get(0).pause().rewind();
          } catch (_error) {}
          if (cb) return cb();
        }
      };
    },
    composite: function(subbuilds) {
      return {
        "do": function(cb) {
          var b, _i, _len;
          for (_i = 0, _len = subbuilds.length; _i < _len; _i++) {
            b = subbuilds[_i];
            b["do"]();
          }
          if (cb) return cb();
        },
        undo: function(cb) {
          var b, _i, _len;
          for (_i = 0, _len = subbuilds.length; _i < _len; _i++) {
            b = subbuilds[_i];
            b.undo();
          }
          if (cb) return cb();
        }
      };
    }
  };

  Slide = (function() {

    Slide.build_list;

    Slide.current_build;

    function Slide(slide_div) {
      var bl, unique_id;
      this.slide_div = slide_div;
      this.build_list = [];
      this.current_build = 0;
      this.first_show = true;
      if (!slide_div.attr('id')) {
        unique_id = 'slide_' + n_slides_global++;
        slide_div.attr('id', unique_id);
      }
      bl = this.build_list;
      $('.build, .incremental ul li, .incremental > *:not(ul)', this.slide_div).each(function(i) {
        var args, argstr, b, bstr, matches, matchstr, subbstr, subbstrs, subbuilds, target, type, _i, _len;
        b = $(this);
        if (b.hasClass('build')) {
          bstr = b.text();
          subbstrs = bstr.split(/\n+|;\n*/);
          subbuilds = [];
          for (_i = 0, _len = subbstrs.length; _i < _len; _i++) {
            subbstr = subbstrs[_i];
            matchstr = /((\w|\d)+)\s*\(\s*(.*?)\s*\)/;
            matches = subbstr.match(matchstr);
            if (matches === null) continue;
            type = matches[1];
            argstr = matches[3];
            args = argstr.split(/\s*,\s*/);
            target = args.shift();
            target = target.replace(/['"]/g, '');
            if ($(target) === null) {
              alert("Invalid target " + target + " in build " + subbstr);
            }
            subbuilds.push(build_types[type].apply(build_types, [target].concat(__slice.call(args))));
          }
          if (subbuilds.length === 0) {
            alert('blah!!');
          } else if (subbuilds.length === 1) {
            bl.push(subbuilds[0]);
          } else {
            bl.push(build_types['composite'](subbuilds.slice(0).reverse()));
          }
        } else {
          bl.push(build_types['appear'](b));
        }
        return b.attr('id', 'build_' + bl.length);
      });
      this.reset();
      return this;
    }

    Slide.prototype.getDiv = function() {
      return this.slide_div;
    };

    Slide.prototype.reset = function() {
      var build, _i, _len, _ref;
      _ref = this.build_list.slice(0).reverse();
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        build = _ref[_i];
        build.undo();
      }
      return this.current_build = 0;
    };

    Slide.prototype.fullReset = function() {
      return this.first_show = true;
    };

    Slide.prototype.hasBuilds = function() {
      return !this.build_list.empty;
    };

    Slide.prototype.doNextBuild = function() {
      if (this.current_build >= this.build_list.length) {
        return false;
      } else {
        this.build_list[this.current_build]["do"]();
        this.current_build += 1;
        return true;
      }
    };

    Slide.prototype.undoPreviousBuild = function() {
      this.current_build -= 1;
      if (this.current_build < 0) {
        this.current_build = 0;
        return false;
      } else {
        this.build_list[this.current_build].undo();
        return true;
      }
    };

    Slide.prototype.show = function(cb) {
      if (this.first_show) {
        this.reset();
        this.first_show = false;
      }
      $(this.slide_div).show(0, cb);
      return refreshVisibility(this.slide_div);
    };

    Slide.prototype.hide = function() {
      return $(this.slide_div).hide();
    };

    return Slide;

  })();

  Presentation = (function() {

    Presentation.slides = [];

    Presentation.current_slide_idx = 0;

    function Presentation() {
      var sl,
        _this = this;
      this.slides = [];
      this.current_slide_idx = 0;
      this.loadIncludes();
      sl = this.slides;
      $('.slide').each(function(i) {
        var s;
        s = new Slide($(this));
        return sl.push(s);
      });
      this.checkURLBarLocation();
      this.showCurrent();
      this.initControls();
      document.onkeydown = function(evt) {
        return _this.keyDown(evt);
      };
      this.buildTOC();
      this.checkURLBarPeriodically(100);
      this.actions = $({});
      this.unique_number = 0;
    }

    Presentation.prototype.loadIncludes = function() {
      var p;
      p = this;
      $('.include').each(function(i) {
        var div, path;
        div = $(this);
        div.empty();
        p.unique_number += 1;
        path = div.attr('src') + '?' + p.unique_number;
        console.log('path: ' + path);
        if (div) {
          return $.get(path, function(xml) {
            console.log("div: " + div + ", xml: " + xml.documentElement);
            div.get(0).appendChild(xml.documentElement);
            return p.showCurrent(function() {
              return p.resetCurrent();
            });
          });
        }
      });
      return $('g').each(function(i) {
        var op;
        op = $(this).css('opacity');
        console.log("opacity = " + op);
        if ($(this).css('opacity') === void 0) return $(this).css('opacity', 1.0);
      });
    };

    Presentation.prototype.advance = function() {
      if (!this.advanceBuild()) return this.advanceSlide();
    };

    Presentation.prototype.revert = function() {
      if (!this.revertBuild()) return this.revertSlide();
    };

    Presentation.prototype.advanceQueued = function() {
      var a, p;
      p = this;
      a = this.actions;
      a.queue('user_interaction', function() {
        return p.advance();
      });
      return a.dequeue('user_interaction');
    };

    Presentation.prototype.revertQueued = function() {
      var a, p;
      p = this;
      a = this.actions;
      a.queue('user_interaction', function() {
        return p.revert();
      });
      return a.dequeue('user_interaction');
    };

    Presentation.prototype.advanceSlide = function() {
      this.current_slide_idx += 1;
      if (this.current_slide_idx >= this.slides.length) {
        this.current_slide_idx = this.slides.length - 1;
      }
      return this.showCurrent();
    };

    Presentation.prototype.revertSlide = function() {
      this.current_slide_idx -= 1;
      if (this.current_slide_idx < 0) this.current_slide_idx = 0;
      return this.showCurrent();
    };

    Presentation.prototype.setCurrent = function(i) {
      return this.current_slide_idx = i;
    };

    Presentation.prototype.showCurrent = function(cb) {
      var i, _ref;
      for (i = 0, _ref = this.slides.length - 1; 0 <= _ref ? i <= _ref : i >= _ref; 0 <= _ref ? i++ : i--) {
        if (i !== this.current_slide_idx) this.slides[i].hide();
      }
      this.slides[this.current_slide_idx].show(cb);
      return location.hash = this.current_slide_idx + 1;
    };

    Presentation.prototype.resetCurrent = function() {
      return this.slides[this.current_slide_idx].reset();
    };

    Presentation.prototype.currentSlideDiv = function() {
      return this.slides[this.current_slide_idx].getDiv();
    };

    Presentation.prototype.advanceBuild = function() {
      return this.slides[this.current_slide_idx].doNextBuild();
    };

    Presentation.prototype.revertBuild = function() {
      return this.slides[this.current_slide_idx].undoPreviousBuild();
    };

    Presentation.prototype.keyDown = function(evt) {
      var key;
      key = evt.keyCode;
      if (key >= 48 && key <= 57) alert('number key!');
      switch (key) {
        case 16:
          return this.shiftKeyActive = true;
        case 32:
          if (this.shiftKeyActive) {
            return this.advance();
          } else {
            return this.revert();
          }
          break;
        case 37:
        case 33:
        case 38:
          return this.revertQueued();
        case 39:
        case 34:
        case 30:
          return this.advanceQueued();
        case 67:
          return this.toggleControls();
        case 82:
          return this.resetCurrent();
        case 84:
          return this.toggleTOC();
        case 69:
          return this.toggleEditPickerMode();
      }
    };

    Presentation.prototype.initControls = function() {
      var back_btn, cancel_btn, edit_btn, edit_inplace_btn, fwd_btn, hover_off, hover_on, p, save_btn;
      p = this;
      back_btn = $('#back_button');
      back_btn.button({
        icons: {
          primary: 'ui-icon-triangle-1-w'
        },
        text: false
      });
      back_btn.click(function() {
        return p.revert();
      });
      fwd_btn = $('#forward_button');
      fwd_btn.button({
        icons: {
          primary: 'ui-icon-triangle-1-e'
        },
        text: false
      });
      fwd_btn.click(function() {
        return p.advance();
      });
      edit_btn = $('#edit_button');
      edit_btn.button({
        icons: {
          primary: 'ui-icon-extlink'
        },
        text: false
      });
      edit_btn.click(function() {
        return p.externalEditPickerMode(edit_btn.attr('checked') === 'checked');
      });
      edit_inplace_btn = $('#edit_inplace_button');
      edit_inplace_btn.button({
        icons: {
          primary: 'ui-icon-pencil'
        },
        text: false
      });
      edit_inplace_btn.click(function() {
        return p.inplaceEditPickerMode(edit_inplace_btn.attr('checked') === 'checked');
      });
      hover_on = function() {
        return $(this).addClass('ui-state-hover');
      };
      hover_off = function() {
        return $(this).removeClass('ui-state-hover');
      };
      $('#presentation_controls button').hover(hover_on, hover_off);
      $('#presentation_controls input').hover(hover_on, hover_off);
      $('#presentation_controls').draggable();
      $('#presentation_controls').addClass('ui-widget-shadow');
      $('#presentation_controls').hide();
      $('body').append('<div id="veil"></div>');
      $('veil').hide();
      $('#notification_popup').notify();
      save_btn = $('#save_button').button();
      save_btn.click(function() {
        return p.saveInplaceEdit(function() {
          return p.reloadAfterEdit();
        });
      });
      cancel_btn = $('#cancel_button').button();
      return cancel_btn.click(function() {
        return p.editPickerMode(false, false, false);
      });
    };

    Presentation.prototype.toggleControls = function() {
      return $('#presentation_controls').toggle();
    };

    Presentation.prototype.transientMessage = function(title, msg, duration) {
      if (msg == null) msg = "";
      if (duration == null) duration = 1000;
      return $('#notification_popup').notify('create', {
        title: title,
        text: msg,
        expires: duration,
        speed: 500
      });
    };

    Presentation.prototype.externalEditPickerMode = function(enabled) {
      return this.editPickerMode(enabled, true);
    };

    Presentation.prototype.inplaceEditPickerMode = function(enabled) {
      return this.editPickerMode(enabled, false);
    };

    Presentation.prototype.toggleEditPickerMode = function() {
      return this.editPickerMode(!this.edit_picker_enabled);
    };

    Presentation.prototype.editPickerMode = function(edit_picker_enabled, external, save) {
      var current, p;
      this.edit_picker_enabled = edit_picker_enabled;
      if (save == null) save = true;
      p = this;
      current = p.currentSlideDiv();
      if (p.edit_picker_enabled) {
        this.transientMessage('Click on an SVG to edit');
        if (external) {
          return $('.include').on('click.edit_include', function() {
            $.get('edit/' + $(this).attr('src'));
            return $('#veil').fadeIn('slow');
          });
        } else {
          $('.include', current).css('background', 'rgb(0.5,0.5,0.5)');
          return $('.include', current).on('click.edit_include', function() {
            return p.inplaceEdit($(this));
          });
        }
      } else {
        if (external) {
          return $('#veil').fadeOut('slow');
        } else {
          if (save) {
            return p.saveInplaceEdit(function() {
              return p.reloadAfterEdit();
            });
          } else {
            return p.reloadAfterEdit();
          }
        }
      }
    };

    Presentation.prototype.reloadAfterEdit = function() {
      this.edit_picker_enabled = false;
      $('.include').removeClass('svg_editor');
      $('.include').unbind('click.edit_include');
      this.loadIncludes();
      this.showCurrent(this.resetCurrent());
      this.setEditorSVGCanvas(void 0);
      this.currently_editted_path = void 0;
      return $('#svg_editor_controls').hide();
    };

    Presentation.prototype.setEditorSVGCanvas = function(svg_canvas) {
      this.svg_canvas = svg_canvas;
    };

    Presentation.prototype.getEditorSVGCanvas = function() {
      return this.svg_canvas;
    };

    Presentation.prototype.inplaceEdit = function(include_div) {
      var frame, init_editor, p, svg_path;
      svg_path = include_div.attr('src');
      this.currently_editted_path = svg_path;
      frame = $('<iframe src="scripts/svg-edit/svg-editor.html" width="100%" height="100%"></iframe>');
      p = this;
      init_editor = function() {
        var svg_canvas;
        svg_canvas = new embedded_svg_edit(frame.get(0));
        p.setEditorSVGCanvas(svg_canvas);
        return $.ajax({
          url: svg_path,
          type: 'GET',
          dataType: 'text',
          timeout: 1000,
          success: function(xml) {
            return svg_canvas.setSvgString(xml);
          }
        });
      };
      frame.load(init_editor);
      include_div.empty();
      include_div.append(frame);
      include_div.addClass('svg_editor');
      $('#svg_editor_controls').fadeIn();
      return $('#presentation_controls').hide();
    };

    Presentation.prototype.saveInplaceEdit = function(cb) {
      var p, svg_canvas;
      this.transientMessage('Saving...');
      p = this;
      svg_canvas = this.getEditorSVGCanvas();
      if (svg_canvas === void 0) {
        alert('No SVG Canvas!');
        if (cb) cb();
        return;
      }
      return svg_canvas.getSvgString()(function(svg_str, err) {
        if (err) alert(err);
        return $.ajax({
          type: 'POST',
          dataType: 'text',
          timeout: 1000,
          url: 'save/' + p.currently_editted_path,
          data: {
            data: svg_str
          },
          success: function() {
            p.transientMessage('File saved.');
            return cb();
          },
          error: function(XHR, stat, msg) {
            return alert('Unable to save SVG: ' + msg);
          }
        });
      });
    };

    Presentation.prototype.generateThumbnailForSlide = function(i, target_parent) {
      var preload, slide_div;
      slide_div = $('.slide').get(i);
      return preload = html2canvas.Preload(slide_div, {
        complete: function(images) {
          var canvas, queue;
          queue = html2canvas.Parse(slide_div, images);
          canvas = $(html2canvas.Renderer(queue));
          canvas.css('width', '100%');
          canvas.css('height', '10%');
          return target_parent.append(canvas);
        }
      });
    };

    Presentation.prototype.buildTOC = function() {
      var anchors, ol, p, t, toc_links;
      toc_links = [];
      $('.slide').each(function(i) {
        var id, title;
        id = i;
        title = $('.title', this).text();
        if (!title) title = 'Slide ' + id;
        $(this).append("<a name='" + id + "'></a>");
        return toc_links.push([id, title]);
      });
      $('body').append('<div id="toc"></div>');
      anchors = [
        (function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = toc_links.length; _i < _len; _i++) {
            t = toc_links[_i];
            _results.push($("<a href=\"javascript:void(0);\">" + t[1] + "</a>"));
          }
          return _results;
        })()
      ];
      p = this;
      $.each(anchors[0], function(i, a) {
        return a.click(function(evt) {
          p.setCurrent(i);
          p.showCurrent();
          return p.toggleTOC();
        });
      });
      ol = $('<ol></ol>');
      p = this;
      $.each(anchors[0], function(i, a) {
        var li;
        li = $('<li></li>');
        a.append("<img src=\"thumbnails/slide_" + (i + 1) + "-thumb.png\" width=\"200\" height=\"150\" alt=\"\"/>");
        li.append(a);
        return ol.append(li);
      });
      return $('#toc').append(ol);
    };

    Presentation.prototype.toggleTOC = function() {
      return $('#toc').fadeToggle();
    };

    Presentation.prototype.checkURLBarLocation = function() {
      var result, slide_number;
      if ((result = window.location.hash.match(/#([0-9]+)/))) {
        slide_number = result[result.length - 1] - 1;
        if (!isNaN(slide_number) && slide_number !== this.current_slide_idx) {
          console.log("setting slide to " + slide_number);
          this.current_slide_idx = slide_number;
          return this.showCurrent();
        }
      }
    };

    Presentation.prototype.checkURLBarPeriodically = function(interval) {
      var check, p;
      p = this;
      check = function() {
        p.checkURLBarLocation();
        return setTimeout(check, interval);
      };
      return setTimeout(check, interval);
    };

    return Presentation;

  })();

  $(function() {
    var p;
    return p = new Presentation();
  });

}).call(this);
