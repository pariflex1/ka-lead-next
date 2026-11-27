(function () {
        function safe(fn) {
            try {
                fn();
            }

            catch (err) {}
        }

        var radios=[], deck=document.getElementById('deck'), app=document.getElementById('app'), hooks={};
        var scenes=Array.prototype.slice.call(deck.querySelectorAll(':scope > .scene'));
        var dkThumbs=Array.prototype.slice.call(document.querySelectorAll('.dk-item .dk-th'));
        var wipePanel=document.getElementById('wipePanel');
        var slideAnim=null, leavingEl=null, enteringEl=null, wipeAnim=null;
        var reducedMotion=window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        function clearSlideAnim() {
            if (slideAnim) {
                try { slideAnim.cancel(); } catch (_) {}
                slideAnim=null;
            }
            if (wipeAnim) {
                try { wipeAnim.cancel(); } catch (_) {}
                wipeAnim=null;
            }
            if (leavingEl) {
                leavingEl.classList.remove('leaving');
                leavingEl=null;
            }
            if (enteringEl) {
                enteringEl.classList.remove('entering');
                enteringEl.style.transformOrigin='';
                enteringEl=null;
            }
        }
        hooks.clearAnim=clearSlideAnim;

        function live() {
            return app.classList.contains('live');
        }
        var lb=document.getElementById('lb'), lbImg=document.getElementById('lbImg'), lbClose=document.getElementById('lbClose');

        function lbOpen() {
            return lb.classList.contains('open');
        }

        function cur() {
            for (var i=0; i < radios.length; i++) if (radios[i].checked) return i; return 0;
        }

        function go(n) {
            safe(function () {
                    n=Math.max(0, Math.min(radios.length - 1, n));
                    var c=cur();
                    if (n===c) return;
                    clearSlideAnim();

                    if (reducedMotion || !live() || !dkThumbs[n]) {
                        deck.classList.toggle('zoom-out', n > c);
                        deck.classList.toggle('zoom-in', n < c);
                        deck.classList.add('no-anim');
                        void deck.offsetWidth;
                        deck.classList.remove('no-anim');
                        void deck.offsetWidth;
                        radios[n].checked=true;
                        radios[n].dispatchEvent(new Event('change', {bubbles:true}));
                        return;
                    }

                    /* loop/reset white panel sweep from left when returning from last slide to first */
                    if (c===radios.length - 1 && n===0 && wipePanel) {
                        var switched=false;
                        wipeAnim=wipePanel.animate([
                            {transform:'translateX(-100%)'},
                            {transform:'translateX(0%)', offset:0.45},
                            {transform:'translateX(0%)', offset:0.55},
                            {transform:'translateX(100%)'}
                        ], {duration:720, easing:'cubic-bezier(0.22, 1, 0.36, 1)'});
                        setTimeout(function () {
                                if (switched) return;
                                switched=true;
                                radios[0].checked=true;
                                radios[0].dispatchEvent(new Event('change', {bubbles:true}));
                            }, 330);
                        wipeAnim.onfinish=function () { wipeAnim=null; };
                        return;
                    }

                    /* card-expansion morph: promote target dock thumbnail into full-screen slide */
                    var W=deck.clientWidth, H=deck.clientHeight;
                    var dr=deck.getBoundingClientRect(), tr=dkThumbs[n].getBoundingClientRect();
                    var gx=tr.left - dr.left, gy=tr.top - dr.top, gw=tr.width || 62, gh=tr.height || 62;
                    /* if thumbnail is scrolled outside strip bounds, start from the right/left edge */
                    gx=Math.max(-gw * 0.5, Math.min(W - gw * 0.5, gx));
                    var k=gw / Math.max(1, W), sh=H * k, off=(gh - sh) / 2;
                    var cl=Math.max(0, (sh - gh) / 2 / k), rad=15 / k;

                    leavingEl=scenes[c];
                    enteringEl=scenes[n];
                    leavingEl.classList.add('leaving');
                    enteringEl.classList.add('entering');
                    enteringEl.style.transformOrigin='0 0';

                    deck.classList.remove('zoom-out', 'zoom-in');
                    radios[n].checked=true;
                    radios[n].dispatchEvent(new Event('change', {bubbles:true}));

                    slideAnim=enteringEl.animate([
                        {
                            transform:'translate(' + gx + 'px,' + (gy + off) + 'px) scale(' + k + ')',
                            clipPath:'inset(' + cl + 'px 0px ' + cl + 'px 0px round ' + rad + 'px)',
                            opacity:0.92
                        },
                        {
                            transform:'translate(0px,0px) scale(1)',
                            clipPath:'inset(0px 0px 0px 0px round 0px)',
                            opacity:1
                        }
                    ], {duration:680, easing:'cubic-bezier(0.22, 1, 0.36, 1)', fill:'forwards'});

                    slideAnim.onfinish=clearSlideAnim;
                });
        }

        safe(function () {
                radios=Array.prototype.slice.call(document.querySelectorAll('input.pg'));

                /* mouse wheel / trackpad scroll changes slide */
                var wheelLock=false;
                deck.addEventListener('wheel', function (e) {
                        if (lbOpen()) return;
                        if (e.target && e.target.closest && e.target.closest('video,iframe')) return;
                        if (e.target && e.target.closest && e.target.closest('.vtrack') && Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
                        var d=e.deltaY;
                        if (Math.abs(d) < 8) return;
                        if (e.cancelable) e.preventDefault();
                        if (wheelLock) return;
                        wheelLock=true;
                        go(cur() + (d > 0 ? 1 : -1));
                        setTimeout(function () {
                                wheelLock=false;
                            }

                            , 650);
                    }

                    , {
                    passive: false
                });

                /* swipe left/right or up/down changes slide */
                var sx=null, sy=null, inTrack=false;
                deck.addEventListener('touchstart', function (e) {
                        if (e.touches.length !==1) {
                            sx=null; return;
                        }

                        var t=e.target;
                        if (t && t.closest && t.closest('video,iframe,input,textarea,select,.dock,.vid-toggle')) {
                            sx=null; return;
                        }

                        inTrack= !!(t && t.closest && t.closest('.vtrack'));
                        sx=e.touches[0].clientX; sy=e.touches[0].clientY;
                    }

                    , {
                    passive: true
                });

                deck.addEventListener('touchend', function (e) {
                        if (sx===null) return;
                        var p=e.changedTouches[0], dx=p.clientX - sx, dy=p.clientY - sy; sx=null;
                        var ax=Math.abs(dx), ay=Math.abs(dy);

                        if (ax > 50 && ax > ay * 1.3 && !inTrack) {
                            if (e.cancelable) e.preventDefault(); go(cur() + (dx < 0 ? 1 : -1));
                        }

                        else if (ay > 60 && ay > ax * 1.3) {
                            go(cur() + (dy < 0 ? 1 : -1));
                        }
                    }

                    , {
                    passive: false
                });

                /* arrow keys */
                document.addEventListener('keydown', function (e) {
                        if (lbOpen() || !live()) return;

                        if (e.key==='ArrowRight' || e.key==='PageDown') {
                            e.preventDefault(); go(cur() + 1);
                        }

                        if (e.key==='ArrowLeft' || e.key==='PageUp') {
                            e.preventDefault(); go(cur() - 1);
                        }
                    });

                /* taps on labels use the same direction-aware zoom */
                deck.addEventListener('click', function (e) {
                        var lbl=e.target && e.target.closest ? e.target.closest('label[for]') : null;
                        if ( !lbl) return;
                        var m=(lbl.getAttribute('for') || '').match(/^r(\d+)$/);
                        if ( !m) return;
                        e.preventDefault();
                        go(parseInt(m[1], 10));
                    });
            });


        /* bottom dock: sync, jump, finger scroll scrubs slides */
        safe(function () {
                var dock=document.getElementById('dock'), strip=document.getElementById('dkStrip');
                var items=Array.prototype.slice.call(strip.querySelectorAll('.dk-item'));
                var darkSet={0:1, 4:1, 8:1, 9:1};
                var first=true, lockUntil=0, idleT=null, fromScrub=false;
                var prgs=items.map(function (it) {
                        return it.querySelector('.dk-bar i');
                    });
                var DUR={1:8000, 2:10000, 7:7000, 8:8000, 9:7000}, DEF=6000;
                var elapsed=0, lastT=0, held=false, started=false, halted=false;

                function dur(i) {
                    return DUR[i] || DEF;
                }

                function setRing(i, p) {
                    prgs[i].style.transform='scaleX(' + p + ')';
                }

                function resetRings() {
                    prgs.forEach(function (_, i) {
                            setRing(i, 0);
                        });
                }

                function center(smooth) {
                    var it=items[cur()];
                    var target=it.offsetLeft + it.offsetWidth / 2 - strip.clientWidth / 2;
                    lockUntil=Date.now() + (smooth ? 800 : 150);
                    strip.scrollTo({left:Math.max(0, target), behavior:smooth ? 'smooth' : 'auto'});
                }

                function nearest() {
                    var mid=strip.scrollLeft + strip.clientWidth / 2, best=0, bd=1e9;
                    items.forEach(function (it, i) {
                            var d=Math.abs(it.offsetLeft + it.offsetWidth / 2 - mid);
                            if (d < bd) {
                                bd=d; best=i;
                            }
                        });
                    return best;
                }

                function sync() {
                    var c=cur();
                    items.forEach(function (it, i) {
                            it.classList.toggle('active', i===c);
                            it.classList.toggle('done', i < c);
                            if (i===c) it.setAttribute('aria-current', 'step'); else it.removeAttribute('aria-current');
                        });
                    dock.classList.toggle('is-dark', !!darkSet[c]);
                    elapsed=0; halted=false; resetRings();
                    document.getElementById('vidToggle').classList.toggle('is-dark', live() && !!darkSet[c]);
                    document.getElementById('homeBtn').classList.toggle('is-dark', !!darkSet[c]);
                    if ( !fromScrub) center( !first);
                    first=false;
                }

                radios.forEach(function (r) {
                        r.addEventListener('change', sync);
                    });

                /* wheel over the dock scrolls the strip sideways, not the slides */
                dock.addEventListener('wheel', function (e) {
                        e.stopPropagation();
                    }, {passive:true});
                strip.addEventListener('wheel', function (e) {
                        var d=Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
                        e.preventDefault();
                        lockUntil=0;
                        strip.scrollLeft+=d;
                    }, {passive:false});

                /* any user touch/drag unlocks scrubbing */
                ['touchstart', 'pointerdown'].forEach(function (ev) {
                        strip.addEventListener(ev, function () {
                                lockUntil=0;
                            }, {passive:true});
                    });

                /* scrolling the strip changes the slide to the centred icon */
                strip.addEventListener('scroll', function () {
                        if (Date.now() < lockUntil) return;
                        var n=nearest();
                        if (n!==cur()) {
                            fromScrub=true; go(n); fromScrub=false;
                        }
                        clearTimeout(idleT);
                        idleT=setTimeout(function () {
                                center(true);
                            }, 140);
                    }, {passive:true});

                /* mouse drag to scroll; click still jumps */
                var down=false, moved=false, sx0=0, sl0=0;
                strip.addEventListener('pointerdown', function (e) {
                        if (e.pointerType!=='mouse') return;
                        down=true; moved=false; sx0=e.clientX; sl0=strip.scrollLeft;
                    });
                window.addEventListener('pointermove', function (e) {
                        if ( !down) return;
                        var dx=e.clientX - sx0;
                        if ( !moved && Math.abs(dx) > 5) {
                            moved=true; strip.classList.add('dragging');
                        }
                        if (moved) strip.scrollLeft=sl0 - dx;
                    });
                window.addEventListener('pointerup', function () {
                        if ( !down) return;
                        down=false; strip.classList.remove('dragging');
                        setTimeout(function () {
                                moved=false;
                            }, 0);
                    });

                /* click a slide icon to jump */
                strip.addEventListener('click', function (e) {
                        if (moved) return;
                        var b=e.target.closest('.dk-item');
                        if (b) go(parseInt(b.getAttribute('data-go'), 10));
                    });

                window.addEventListener('resize', function () {
                        center(false);
                    });
                /* auto-advance: starts once the visitor leaves slide 1; slide 1 and the last slide never auto-move */
                function tick(t) {
                    var dt=lastT ? Math.min(100, t - lastT) : 0; lastT=t;
                    var c=cur();
                    if (c > 0) started=true;
                    if (live() && started && !halted && c > 0 && c < items.length - 1 && !held && !document.hidden && !lbOpen()) {
                        elapsed+=dt;
                        var p=Math.min(1, elapsed / dur(c));
                        setRing(c, p);
                        if (p >=1) go(c + 1);
                    }
                    requestAnimationFrame(tick);
                }

                /* touching the slide's own content (carousel, map, video, plans, links...) stops auto-advance on that slide until the visitor moves it */
                deck.addEventListener('pointerdown', function (e) {
                        var t=e.target;
                        if ( !t || !t.closest || t.closest('.dock,.vid-toggle,.tap')) return;
                        if ( !t.closest('.scene')) return;
                        halted=true; elapsed=0; resetRings();
                    }, {passive:true});

                /* hold a finger / mouse button down to pause */
                ['pointerdown', 'touchstart'].forEach(function (ev) {
                        deck.addEventListener(ev, function () {
                                held=true;
                            }, {passive:true});
                    });
                ['pointerup', 'pointercancel', 'touchend', 'touchcancel'].forEach(function (ev) {
                        window.addEventListener(ev, function () {
                                held=false;
                            }, {passive:true});
                    });
                requestAnimationFrame(tick);

                sync();
            });


        /* villas carousel */
        safe(function () {
                var track=document.getElementById('vTrack'); if ( !track) return;
                var tabs=Array.prototype.slice.call(document.querySelectorAll('.vtab'));
                var dots=Array.prototype.slice.call(document.querySelectorAll('.vdot'));
                var info=document.getElementById('vInfo');
                var data=[
                    {area:'966 sq.ft.', size:'21 × 46 ft.', built:'1,600 sq.ft.', rooms:'3 Bedrooms + Study · Drawing & Dining · Kitchen · Front & Rear Lawn'},
                    {area:'966 sq.ft.', size:'21 × 46 ft.', built:'1,300 sq.ft.', rooms:'2 Bedrooms · Drawing & Dining · Kitchen · Front & Rear Lawn'}
                ];
                var curV=0, idx=0;

                function show(v) {
                    if (v===curV) return;
                    curV=v;
                    tabs.forEach(function (t, i) {
                            t.classList.toggle('on', i===v); t.setAttribute('aria-selected', i===v ? 'true' : 'false');
                        });
                    var d=data[v];
                    document.getElementById('vArea').textContent=d.area;
                    document.getElementById('vSize').textContent=d.size;
                    document.getElementById('vBuilt').textContent=d.built;
                    document.getElementById('vRooms').textContent=d.rooms;
                    info.classList.remove('swap'); void info.offsetWidth; info.classList.add('swap');
                }

                track.addEventListener('scroll', function () {
                        var i=Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
                        if (i===idx) return;
                        idx=i;
                        dots.forEach(function (d, k) {
                                d.classList.toggle('on', k===i);
                            });
                        show(i < 3 ? 0 : 1);
                    }, {passive:true});

                function scrollToIdx(i) {
                    track.scrollTo({left:i * track.clientWidth, behavior:'smooth'});
                }

                tabs.forEach(function (t) {
                        t.addEventListener('click', function () {
                                scrollToIdx(parseInt(t.getAttribute('data-v'), 10) * 3);
                            });
                    });
                dots.forEach(function (d) {
                        d.addEventListener('click', function () {
                                scrollToIdx(parseInt(d.getAttribute('data-i'), 10));
                            });
                    });

                /* mouse drag */
                var down=false, moved=false, x0=0, l0=0;
                track.addEventListener('pointerdown', function (e) {
                        if (e.pointerType!=='mouse') return;
                        down=true; moved=false; x0=e.clientX; l0=track.scrollLeft;
                    });
                window.addEventListener('pointermove', function (e) {
                        if ( !down) return;
                        var dx=e.clientX - x0;
                        if ( !moved && Math.abs(dx) > 5) {
                            moved=true; track.classList.add('dragging');
                        }
                        if (moved) track.scrollLeft=l0 - dx;
                    });
                window.addEventListener('pointerup', function () {
                        if ( !down) return;
                        down=false;
                        if (moved) {
                            track.classList.remove('dragging');
                            scrollToIdx(Math.round(track.scrollLeft / Math.max(1, track.clientWidth)));
                        }
                    });
                track.addEventListener('click', function (e) {
                        if (moved) {
                            e.stopPropagation(); e.preventDefault(); moved=false;
                        }
                    }, true);
            });

        /* plan viewer with zoom: tap/click, pinch, wheel, +/- buttons, drag to pan */
        safe(function () {
                var lbIn=document.getElementById('lbIn'), lbOut=document.getElementById('lbOut');
                var sc=1, tx=0, ty=0, MAXZ=6;
                var ptrs={}, drag=null, pinch=null, moved=false;

                function apply(anim) {
                    lbImg.classList.toggle('anim', !!anim);
                    lbImg.style.transform='translate(' + tx + 'px,' + ty + 'px) scale(' + sc + ')';
                    lb.classList.toggle('zoomed', sc > 1.01);
                }

                function clamp() {
                    var w=lbImg.offsetWidth * sc, h=lbImg.offsetHeight * sc;
                    var mx=Math.max(0, (w - lb.clientWidth) / 2), my=Math.max(0, (h - lb.clientHeight) / 2);
                    tx=Math.min(mx, Math.max( -mx, tx)); ty=Math.min(my, Math.max( -my, ty));
                }

                /* zoom to scale ns keeping the screen point (px,py) fixed */
                function zoomAt(ns, px, py, anim) {
                    ns=Math.min(MAXZ, Math.max(1, ns));
                    var cx=lb.clientWidth / 2, cy=lb.clientHeight / 2;
                    var qx=(px - cx - tx) / sc, qy=(py - cy - ty) / sc;
                    sc=ns; tx=px - cx - qx * ns; ty=py - cy - qy * ns;
                    if (sc===1) {
                        tx=0; ty=0;
                    }
                    clamp(); apply(anim);
                }

                function reset() {
                    sc=1; tx=0; ty=0; ptrs={}; drag=null; pinch=null; apply(false);
                }

                function open(src, alt) {
                    reset();
                    lbImg.src=src; lbImg.alt=alt || '';
                    lb.classList.add('open'); deck.classList.add('lbopen'); lbClose.focus();
                }

                function close() {
                    lb.classList.remove('open'); deck.classList.remove('lbopen'); lbImg.removeAttribute('src'); reset();
                }

                Array.prototype.forEach.call(document.querySelectorAll('[data-lb]'), function (b) {
                        b.addEventListener('click', function () {
                                open(b.getAttribute('data-lb'), b.getAttribute('data-alt'));
                            });
                    });

                Array.prototype.forEach.call(document.querySelectorAll('.zoomable'), function (img) {
                        img.tabIndex=0; img.setAttribute('role', 'button');
                        img.addEventListener('click', function () {
                                open(img.currentSrc || img.src, img.alt);
                            });
                        img.addEventListener('keydown', function (e) {
                                if (e.key==='Enter' || e.key===' ') {
                                    e.preventDefault(); open(img.currentSrc || img.src, img.alt);
                                }
                            });
                    });

                lbClose.addEventListener('click', close);
                lbIn.addEventListener('click', function () {
                        zoomAt(sc * 1.6, lb.clientWidth / 2, lb.clientHeight / 2, true);
                    });
                lbOut.addEventListener('click', function () {
                        zoomAt(sc / 1.6, lb.clientWidth / 2, lb.clientHeight / 2, true);
                    });

                document.addEventListener('keydown', function (e) {
                        if ( !lb.classList.contains('open')) return;
                        if (e.key==='Escape') close();
                        else if (e.key==='+' || e.key==='=') zoomAt(sc * 1.6, lb.clientWidth / 2, lb.clientHeight / 2, true);
                        else if (e.key==='-') zoomAt(sc / 1.6, lb.clientWidth / 2, lb.clientHeight / 2, true);
                        else if (e.key==='0') zoomAt(1, 0, 0, true);
                    });

                lb.addEventListener('wheel', function (e) {
                        if ( !lb.classList.contains('open')) return;
                        e.preventDefault();
                        zoomAt(sc * Math.exp( -e.deltaY * 0.0018), e.clientX, e.clientY, false);
                    }, {passive:false});

                function dist() {
                    var k=Object.keys(ptrs); if (k.length < 2) return 0;
                    var a=ptrs[k[0]], b=ptrs[k[1]]; return Math.hypot(a.x - b.x, a.y - b.y);
                }

                function mid() {
                    var k=Object.keys(ptrs), a=ptrs[k[0]], b=ptrs[k[1]];
                    return {x:(a.x + b.x) / 2, y:(a.y + b.y) / 2};
                }

                lb.addEventListener('pointerdown', function (e) {
                        if (e.target.closest('button')) return;
                        ptrs[e.pointerId]={x:e.clientX, y:e.clientY};
                        try {
                            lb.setPointerCapture(e.pointerId);
                        }

                        catch (_) {}

                        var n=Object.keys(ptrs).length;
                        if (n===1) {
                            moved=false; drag={x:e.clientX, y:e.clientY, tx:tx, ty:ty, onImg:e.target===lbImg};
                        }

                        else if (n===2) {
                            pinch={d:dist(), s:sc}; drag=null; moved=true;
                        }
                    });

                lb.addEventListener('pointermove', function (e) {
                        if ( !ptrs[e.pointerId]) return;
                        ptrs[e.pointerId]={x:e.clientX, y:e.clientY};
                        if (pinch && Object.keys(ptrs).length >=2) {
                            var m=mid(); zoomAt(pinch.s * dist() / Math.max(1, pinch.d), m.x, m.y, false);
                        }

                        else if (drag) {
                            var dx=e.clientX - drag.x, dy=e.clientY - drag.y;
                            if ( !moved && Math.hypot(dx, dy) > 6) moved=true;
                            if (moved && sc > 1) {
                                tx=drag.tx + dx; ty=drag.ty + dy; clamp(); apply(false);
                            }
                        }
                    });

                function endPtr(e) {
                    if ( !ptrs[e.pointerId]) return;
                    var wasDrag=drag, wasMoved=moved;
                    delete ptrs[e.pointerId];
                    var n=Object.keys(ptrs).length;
                    if (n < 2) pinch=null;
                    if (n===0) {
                        if (e.type==='pointerup' && wasDrag && !wasMoved) {
                            if (wasDrag.onImg) {
                                zoomAt(sc > 1.05 ? 1 : 2.6, e.clientX, e.clientY, true);   /* tap image: zoom in / out */
                            }

                            else {
                                close();   /* tap outside the image closes */
                            }
                        }

                        drag=null;
                    }

                    else if (n===1) {
                        var k=Object.keys(ptrs)[0];
                        drag={x:ptrs[k].x, y:ptrs[k].y, tx:tx, ty:ty, onImg:true}; moved=true;
                    }
                }

                lb.addEventListener('pointerup', endPtr);
                lb.addEventListener('pointercancel', endPtr);
                window.addEventListener('resize', function () {
                        clamp(); apply(false);
                    });
            });

        safe(function () {
                var video=document.querySelector('#p8 video'), toggle=document.getElementById('vidToggle');
                var evs=['touchstart', 'touchmove', 'touchend', 'pointerdown', 'pointerup', 'wheel', 'scroll', 'click', 'keydown'];
                var done=false, userPaused=false, stopping=false, lastTry=0;

                function cleanup() {
                    done=true;
                }

                hooks.kick=function () {
                    if (userPaused) return;
                    done=false; lastTry=0; tryWithSound();
                };
                hooks.stop=function () {
                    stopping=true; video.pause(); stopping=false; done=false; userPaused=false;
                };

                function quiet(pr) {
                    if (pr && pr.catch) pr.catch(function () {});
                }

                /* try to play WITH sound; if the browser refuses, keep playing muted and try again on the next touch / scroll / tap */
                function tryWithSound() {
                    if (userPaused) return;
                    video.muted=false;
                    var pr=video.play();
                    var fallback=function () {
                        if (userPaused) return;
                        video.muted=true; quiet(video.play());
                    };

                    if (pr && pr.then) pr.then(function () {
                            setTimeout(function () {
                                    if (userPaused) return;
                                    if (video.paused) fallback(); else if ( !video.muted) cleanup();
                                }, 300);
                        }, fallback);
                }

                function onEvt(e) {
                    if (done || userPaused) return;
                    if (e.target && e.target.closest && e.target.closest('#vidToggle,#homeBtn')) return;
                    var now=Date.now();
                    if (now - lastTry < 600) return;
                    lastTry=now;
                    tryWithSound();
                }

                evs.forEach(function (ev) {
                        document.addEventListener(ev, onEvt, {capture:true, passive:true});
                    });

                /* attempt autoplay with sound immediately on initial load */
                tryWithSound();

                function updateToggle() {
                    toggle.classList.toggle('playing', !video.paused);
                    toggle.setAttribute('aria-label', video.paused ? 'Play video' : 'Pause video');
                }

                toggle.addEventListener('click', function (e) {
                        e.stopPropagation();
                        if (video.paused) {
                            userPaused=false;
                            video.muted=false;
                            quiet(video.play());
                        } else {
                            userPaused=true;
                            video.pause();
                        }
                    });

                video.addEventListener('play', function () {
                        userPaused=false;
                        if ( !video.muted) done=true;
                        updateToggle();
                    });
                video.addEventListener('pause', function () {
                        if ( !stopping) userPaused=true;
                        updateToggle();
                    });
                updateToggle();
            });

        /* ===== v2: preview grid, preview carousel, morph open / close ===== */
        safe(function () {
                var home=document.getElementById('home'), homeBtn=document.getElementById('homeBtn');
                var track=document.getElementById('colL'), stage=document.getElementById('faStage'), span=document.getElementById('faSpan');
                var sections=Array.prototype.slice.call(deck.querySelectorAll(':scope > .scene'));
                var names=['Home', 'Overview', 'Villas', 'Plots', 'Amenities', 'Features', 'Loan', 'Location', 'Video', 'Site Plan', 'Contact'];
                var DURMS=680, EASE='cubic-bezier(0.22, 1, 0.36, 1)';
                var cards=[], hosts=[], busy=false, pushed=false;

                function buildPreview(sec) {
                    var c=sec.cloneNode(true);
                    c.removeAttribute('id'); c.removeAttribute('data-i');
                    Array.prototype.forEach.call(c.querySelectorAll('[id]'), function (n) {
                            n.removeAttribute('id');
                        });
                    Array.prototype.forEach.call(c.querySelectorAll('.tap'), function (n) {
                            n.parentNode.removeChild(n);
                        });
                    Array.prototype.forEach.call(c.querySelectorAll('video,iframe'), function (n) {
                            var d=document.createElement('div'); d.className='ph'; n.parentNode.replaceChild(d, n);
                        });
                    Array.prototype.forEach.call(c.querySelectorAll('img'), function (im) {
                            im.draggable=false; im.classList.remove('zoomable'); im.removeAttribute('tabindex'); im.removeAttribute('role');
                        });
                    var w=document.createElement('div'); w.className='pv-in'; w.setAttribute('aria-hidden', 'true'); w.appendChild(c);
                    return w;
                }

                /* one preview card per slide (previews are filled in lazily) */
                sections.forEach(function (sec, i) {
                        var card=document.createElement('button');
                        card.type='button'; card.className='card';
                        card.setAttribute('aria-label', 'Open slide ' + (i + 1) + ': ' + names[i]);
                        var host=document.createElement('div'); host.className='pv-host';
                        host._sec=sec; card._host=host;
                        var lab=document.createElement('div'); lab.className='clab'; lab.innerHTML='<span>' + names[i] + '</span>';
                        card._lab=lab; stage.appendChild(lab);
                        card.appendChild(host);
                        card.addEventListener('click', function () {
                                var N=vis.length, k=vis.indexOf(card), d=k - track.scrollLeft / STEP;
                                if (loopOn) {
                                    d=((d % N) + N) % N; if (d > N / 2) d-=N;
                                }

                                if (Math.abs(d) < 0.4) openSlide(i);
                                else if (loopOn) animateTo((Math.round(track.scrollLeft / STEP) + Math.round(d)) * STEP);
                                else animateTo(k * STEP);
                            });
                        stage.appendChild(card);
                        cards[i]=card; hosts.push(host);
                    });

                /* carousel thumbnails use the same live previews */
                Array.prototype.forEach.call(document.querySelectorAll('.dk-item .pv-host'), function (host, i) {
                        host._sec=sections[i]; hosts.push(host);
                    });

                /* previews are cloned only when first needed: visible cards at once, the rest while the browser is idle */
                function fill(h) {
                    if (h._done) return;
                    h._done=true; h.appendChild(buildPreview(h._sec));
                }

                var idle=window.requestIdleCallback || function (f) {
                    return setTimeout(f, 80);
                };
                function pump(q) {
                    if ( !q.length) return;
                    idle(function () {
                            fill(q.shift()); pump(q);
                        }, {timeout:1200});
                }

                function carMetrics(W) {
                    var av=W - 14 - 8;
                    return {PAD:14, GAP:8, L:av * 0.8, S:av * 0.2};
                }

                function layout() {
                    var W=app.clientWidth, H=app.clientHeight;
                    app.style.setProperty('--sw', W + 'px'); app.style.setProperty('--sh', H + 'px');
                    hosts.forEach(function (h) {
                            if (h.parentNode && h.parentNode.classList && h.parentNode.classList.contains('card')) {
                                var ch=stage.clientHeight - 76, cm=carMetrics(W), kk=cm.L / W;
                                h.style.setProperty('--pw', cm.L + 'px'); h.style.setProperty('--k', kk); h.style.setProperty('--oy', ((ch - H * kk) / 2) + 'px'); return;
                            }

                            var hw=h.clientWidth, hh=h.clientHeight; if ( !hw) return;
                            var k=hw / W;
                            h.style.setProperty('--k', k); h.style.setProperty('--oy', ((hh - H * k) / 2) + 'px');
                        });
                }

                layout();
                window.addEventListener('resize', layout);
                window.addEventListener('load', layout);
                if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);

                /* ---------- morph: the real slide grows out of its preview card (and back) ---------- */
                function geom(el) {
                    var a=app.getBoundingClientRect(), r=el.getBoundingClientRect();
                    return {x:r.left - a.left, y:r.top - a.top, w:r.width, h:r.height};
                }

                function frames(g) {
                    var W=app.clientWidth, H=app.clientHeight, k=g.w / W, sh=H * k, off=(g.h - sh) / 2;
                    var cl=Math.max(0, (sh - g.h) / 2 / k), rad=28 / k;
                    return {
                        from:{transform:'translate(' + g.x + 'px,' + (g.y + off) + 'px) scale(' + k + ')', clipPath:'inset(' + cl + 'px 0px ' + cl + 'px 0px round ' + rad + 'px)'},
                        to:{transform:'translate(0px,0px) scale(1)', clipPath:'inset(0px 0px 0px 0px round 0px)'}
                    };
                }

                var heroT=0, heroAuto=false;
                function restartHero() {
                    var wait=app.classList.contains('opening') ? 0.7 : 0;
                    Array.prototype.forEach.call(sections[0].querySelectorAll('.bg'), function (el) {
                            el.style.setProperty('--hd', wait + 's');
                            el.style.animation='none'; void el.offsetWidth; el.style.animation='';
                        });
                    clearTimeout(heroT);
                    if (heroAuto) heroT=setTimeout(function () {
                                heroAuto=false;
                                if (live() && radios[0].checked && !lbOpen()) go(1);
                            }, (wait + 3.2) * 1000);
                }

                function openSlide(i) {
                    if (busy || live()) return;
                    busy=true;
                    var card=cards[i], f=frames(geom(card));
                    deck.classList.remove('zoom-out', 'zoom-in');
                    deck.classList.add('morphing');
                    void deck.offsetWidth;
                    radios[i].checked=true;
                    radios[i].dispatchEvent(new Event('change', {bubbles:true}));
                    if (i===0) {
                        heroAuto=true; restartHero();
                    }

                    card.classList.add('sel'); home.classList.add('away');
                    app.classList.add('live', 'opening');
                    radios[i].dispatchEvent(new Event('change', {bubbles:true}));
                    if (hooks.kick) hooks.kick();
                    try {
                        history.pushState({ka:1}, ''); pushed=true;
                    }

                    catch (_) {}

                    deck.style.transformOrigin='0 0';
                    var an=deck.animate([f.from, f.to], {duration:DURMS, easing:EASE, fill:'forwards'});
                    an.onfinish=function () {
                        app.classList.remove('opening'); app.classList.add('open');
                        deck.style.transformOrigin=''; deck.classList.remove('morphing');
                        an.cancel(); busy=false;
                    };
                }

                function closeToGrid() {
                    if (busy || !live()) return;
                    busy=true;
                    if (hooks.clearAnim) hooks.clearAnim();
                    document.getElementById('vidToggle').classList.remove('is-dark');
                    var i=cur(), card=cards[i];
                    app.classList.remove('open'); app.classList.add('closing');
                    focusCard(card);
                    var f=frames(geom(card));
                    cards.forEach(function (c) {
                            c.classList.remove('sel');
                        });
                    card.classList.add('sel');
                    deck.classList.add('morphing');
                    deck.style.transformOrigin='0 0';
                    var an=deck.animate([f.to, f.from], {duration:DURMS, easing:EASE, fill:'forwards'});
                    requestAnimationFrame(function () {
                            home.classList.remove('away');
                        });
                    an.onfinish=function () {
                        app.classList.remove('live', 'closing');
                        deck.style.transformOrigin=''; deck.classList.remove('morphing');
                        card.classList.remove('sel');
                        an.cancel(); busy=false;
                    };
                }

                homeBtn.addEventListener('click', function (e) {
                        e.stopPropagation();
                        if (pushed) {
                            try {
                                history.back(); return;
                            }

                            catch (_) {}
                        }

                        closeToGrid();
                    });
                window.addEventListener('popstate', function () {
                        pushed=false; if (live()) closeToGrid();
                    });
                document.addEventListener('keydown', function (e) {
                        if (e.key==='Escape' && live() && !lbOpen()) closeToGrid();
                    });


                /* ---------- Files-app behaviour: multi-browse carousel (large / medium / small), ripple, search, floating pill ---------- */
                function ripple(el, e) {
                    var r=el.getBoundingClientRect(), d=Math.max(r.width, r.height) * 2;
                    var x=(e.clientX || r.left + r.width / 2) - r.left - d / 2, y=(e.clientY || r.top + r.height / 2) - r.top - d / 2;
                    var sp=document.createElement('span'); sp.className='ripple';
                    sp.style.cssText='width:' + d + 'px;height:' + d + 'px;left:' + x + 'px;top:' + y + 'px';
                    el.appendChild(sp); setTimeout(function () {
                            if (sp.parentNode) sp.parentNode.removeChild(sp);
                        }, 650);
                }

                Array.prototype.forEach.call(home.querySelectorAll('.card, .fa-ico[type=button]'), function (el) {
                        el.addEventListener('pointerdown', function (e) {
                                ripple(el, e);
                            });
                    });
                var inp=document.getElementById('faInput'), empty=document.getElementById('faEmpty');
                var vis=cards.slice(), STEP=120, loopOn=false, REPS=21, rc=0, CW=track.clientWidth, CM=carMetrics(CW), nextEl=document.getElementById('faNext');

                /* width of a card by its distance t from the focused position: 0 -> large (80%), 1+ -> small (20%), -1 -> gone */
                function wOf(t, m) {
                    if (t <= -1) return 0;
                    if (t < 0) return m.L * (t + 1);
                    if (t < 1) return m.L + (m.S - m.L) * t;
                    return m.S;
                }

                function baseIdx() {
                    return loopOn ? Math.floor(REPS / 2) * vis.length : 0;
                }

                function paint() {
                    var N=vis.length, W=CW, m=CM, p=track.scrollLeft / STEP, x=m.PAD, i0=0, fr=p;
                    if (loopOn) {
                        i0=Math.floor(p); fr=p - i0;
                        nextEl.classList.remove('dim');
                    } else {
                        nextEl.classList.toggle('dim', p > N - 1.05);
                    }

                    for (var j=0; j < N; j++) {
                        var c=loopOn ? vis[((i0 + j) % N + N) % N] : vis[j], w=wOf(j - fr, m);
                        if (w < 8 || x > W + 4) {
                            if (c._h!==1) {
                                c._h=1; c.style.visibility='hidden'; c.style.width='0px'; c._lab.style.visibility='hidden';
                            }

                            continue;
                        }

                        if (c._h!==0) {
                            c._h=0; c.style.visibility=''; c._lab.style.visibility=''; fill(c._host);
                        }

                        c.style.width=w + 'px'; c.style.translate=x + 'px 0';
                        c._lab.style.width=w + 'px'; c._lab.style.translate=x + 'px 0';
                        c._lab.style.setProperty('--lo', Math.max(0, Math.min(1, (w - m.L * 0.55) / (m.L * 0.3))).toFixed(2));
                        x+=w + m.GAP * Math.min(1, w / m.S);
                    }
                }

                function sync(idx) {
                    var N=vis.length, W=CW=track.clientWidth, m=CM=carMetrics(W);
                    loopOn=N >= 3;
                    STEP=Math.max(80, Math.round((m.L + m.GAP) * 0.75));
                    var total=loopOn ? N * REPS : N;
                    track.style.setProperty('--span', Math.max(0, total - 1) * STEP + 'px');
                    Array.prototype.forEach.call(track.querySelectorAll('.snap'), function (n) {
                            track.removeChild(n);
                        });
                    var fr=document.createDocumentFragment();
                    for (var k=0; k < total; k++) {
                        var n=document.createElement('div'); n.className='snap';
                        n.style.left=k * STEP + 'px'; n.style.width=STEP + 'px'; fr.appendChild(n);
                    }

                    track.appendChild(fr);
                    idx=Math.max(0, Math.min(Math.max(0, N - 1), idx || 0));
                    noSnap(function () {
                            track.scrollLeft=(baseIdx() + idx) * STEP;
                        });
                }

                function noSnap(fn) {
                    track.style.scrollSnapType='none'; fn(); track.style.scrollSnapType='';
                }

                /* eased programmatic scroll (same smoothness in every browser) */
                var anim=0;
                function cancelAnim() {
                    if (anim) {
                        cancelAnimationFrame(anim); anim=0; track.style.scrollSnapType='';
                    }
                }

                function animateTo(x) {
                    cancelAnim();
                    var x0=track.scrollLeft, d=x - x0;
                    if (Math.abs(d) < 1) return;
                    var t0=performance.now(), dur=Math.min(720, 380 + Math.abs(d) * 0.5);
                    track.style.scrollSnapType='none';
                    (function step(now) {
                            var u=Math.min(1, (now - t0) / dur), e=u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
                            track.scrollLeft=x0 + d * e;
                            if (u < 1) anim=requestAnimationFrame(step); else {
                                anim=0; track.style.scrollSnapType='';
                            }
                        })(t0);
                }

                function goStep(d) {
                    var i=Math.round(track.scrollLeft / STEP) + d;
                    if ( !loopOn) i=Math.max(0, Math.min(vis.length - 1, i));
                    animateTo(i * STEP);
                }

                track.addEventListener('touchstart', cancelAnim, {passive:true});
                track.addEventListener('pointerdown', cancelAnim);

                function focusCard(card) {
                    if (card.classList.contains('hide')) {
                        inp.value=''; filter();
                    }

                    var k=Math.max(0, vis.indexOf(card));
                    noSnap(function () {
                            track.scrollLeft=(baseIdx() + k) * STEP;
                        });
                    paint();
                }

                function recenter() {
                    if (anim || drag) return;
                    var N=vis.length, i=Math.round(track.scrollLeft / STEP), mid=Math.floor(REPS / 2) * N;
                    if (Math.abs(i - mid) > N * (Math.floor(REPS / 2) - 3)) noSnap(function () {
                                track.scrollLeft=(mid + ((i % N) + N) % N) * STEP;
                            });
                }

                track.addEventListener('scroll', function () {
                        paint();
                        if (loopOn) {
                            clearTimeout(rc); rc=setTimeout(recenter, 180);
                        }
                    }, {passive:true});
                window.addEventListener('resize', function () {
                        sync(focusIdx()); paint();
                    });
                sync(0); paint(); setTimeout(function () {
                        sync(focusIdx()); paint(); layout();
                    }, 80);
                window.addEventListener('load', function () {
                        sync(focusIdx()); paint();
                    });

                pump(cards.map(function (c) {
                            return c._host;
                        }).concat(Array.prototype.slice.call(document.querySelectorAll('.dk-item .pv-host'))));

                /* entrance: cards slide in from the right one after another */
                cards.forEach(function (c, i) {
                        c.style.setProperty('--d', (i < 3 ? i * 110 : 0) + 'ms'); c._lab.style.setProperty('--d', (i < 3 ? i * 110 : 0) + 'ms');
                    });
                requestAnimationFrame(function () {
                        requestAnimationFrame(function () {
                                cards.forEach(function (c) {
                                        c.classList.add('in'); c._lab.classList.add('in');
                                    });
                            });
                    });
                setTimeout(function () {
                        cards.forEach(function (c) {
                                c.style.setProperty('--d', '0ms'); c._lab.style.setProperty('--d', '0ms');
                            });
                    }, 1500);

                /* desktop: wheel and mouse-drag move the carousel too */
                track.addEventListener('wheel', function (e) {
                        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                            cancelAnim(); track.style.scrollSnapType='none'; track.scrollLeft+=e.deltaY; e.preventDefault();
                            clearTimeout(track._t); track._t=setTimeout(function () {
                                    track.style.scrollSnapType='';
                                }, 140);
                        }
                    }, {passive:false});
                var drag=null, moved=false;
                track.addEventListener('pointerdown', function (e) {
                        if (e.pointerType!=='mouse' || e.button!==0) return;
                        drag={x:e.clientX, s:track.scrollLeft}; moved=false;
                    });
                window.addEventListener('pointermove', function (e) {
                        if ( !drag) return;
                        var dx=e.clientX - drag.x;
                        if (Math.abs(dx) > 5) {
                            moved=true; track.style.scrollSnapType='none';
                        }

                        if (moved) track.scrollLeft=drag.s - dx * 2.2;
                    });
                window.addEventListener('pointerup', function () {
                        if ( !drag) return;
                        drag=null;
                        if (moved) {
                            track.style.scrollSnapType='';
                            animateTo((loopOn ? Math.round(track.scrollLeft / STEP) : Math.max(0, Math.min(vis.length - 1, Math.round(track.scrollLeft / STEP)))) * STEP);
                            setTimeout(function () {
                                    moved=false;
                                }, 60);
                        }
                    });
                track.addEventListener('click', function (e) {
                        if (moved) {
                            e.stopPropagation(); e.preventDefault();
                        }
                    }, true);

                /* home carousel moves to the next card by itself; pauses while the user is interacting */
                var lastAct=Date.now();
                ['pointerdown', 'touchstart', 'wheel', 'keydown', 'focusin'].forEach(function (ev) {
                        home.addEventListener(ev, function () {
                                lastAct=Date.now();
                            }, {passive:true, capture:true});
                    });
                if ( !window.matchMedia('(prefers-reduced-motion: reduce)').matches) setInterval(function () {
                            if (live() || busy) {
                                lastAct=Date.now(); return;
                            }

                            if (document.hidden || !loopOn || anim || drag || document.activeElement===inp) return;
                            if (Date.now() - lastAct < 4500) return;
                            lastAct=Date.now() - 1000; goStep(1);
                        }, 500);

                /* bottom pill: previous / play / next */
                function focusIdx() {
                    var N=vis.length, i=Math.round(track.scrollLeft / STEP);
                    return loopOn ? ((i % N) + N) % N : Math.max(0, Math.min(N - 1, i));
                }

                document.getElementById('faCall').addEventListener('click', function () {
                        var idx=names.findIndex(function (n) {
                                return /contact/i.test(n);
                            });
                        if (idx < 0) idx=cards.length - 1;
                        cancelAnim(); focusCard(cards[idx]); openSlide(idx);
                    });
                document.getElementById('faNext').addEventListener('click', function () {
                        goStep(1);
                    });
                function playSelected() {
                    cancelAnim();
                    var c=vis[focusIdx()];
                    if ( !c) return;
                    focusCard(c); openSlide(cards.indexOf(c));
                }

                document.getElementById('faPlay').addEventListener('click', playSelected);


                /* search every word on every slide */
                var index=sections.map(function (sec, i) {
                        var t=sec.textContent + ' ' + names[i];
                        Array.prototype.forEach.call(sec.querySelectorAll('img[alt]'), function (im) {
                                t+=' ' + im.getAttribute('alt');
                            });
                        return t.replace(/\s+/g, ' ').toLowerCase();
                    });
                function filter() {
                    var words=inp.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
                    vis=[];
                    cards.forEach(function (c, i) {
                            var ok=words.every(function (w) {
                                    return index[i].indexOf(w)>-1;
                                });
                            c.classList.toggle('hide', !ok); c._lab.classList.toggle('gone', !ok); if (ok) {
                                c.classList.add('in'); c._lab.classList.add('in'); vis.push(c);
                            }
                        });
                    empty.classList.toggle('on', vis.length===0);
                    sync(0);
                    paint();
                }

                inp.addEventListener('input', filter);
                inp.addEventListener('keydown', function (e) {
                        if (e.key==='Enter') inp.blur();
                    });

                /* going back to slide 1 replays the day to night fade */
                radios[0].addEventListener('change', function () {
                        if (radios[0].checked && live()) restartHero();
                    });
                radios.forEach(function (r) {
                        r.addEventListener('change', function () {
                                if ( !radios[0].checked) {
                                    heroAuto=false; clearTimeout(heroT);
                                }
                            });
                    });
            });
    })();
