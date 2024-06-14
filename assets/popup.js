if (!window.Eurus.loadedScript.includes('popup.js')) {
  window.Eurus.loadedScript.push('popup.js');
  
  requestAnimationFrame(() => {
    document.addEventListener('alpine:init', () => {
      Alpine.data('xPopups', (data) => ({
        enable: false,
        show: Shopify.designMode ? ( localStorage.getItem(data.name + '-' + data.sectionId)?.length ? xParseJSON(localStorage.getItem(data.name + '-' + data.sectionId)) : false ) : false,
        delayDays: data.delayDays ? data.delayDays : 0,
        t: '',
        inMotion: false,
        init() {
          if (Shopify.designMode) {
            var _this = this;
            const handlePopupSelect = (event) => {
              if (event.detail.sectionId.includes(data.sectionId)) {
                if (window.Alpine) {
                  _this.open();
                  localStorage.setItem(data.name + '-' + data.sectionId, JSON.stringify(true));
                } else {
                  document.addEventListener('alpine:initialized', () => {
                    _this.open();
                    localStorage.setItem(data.name + '-' + data.sectionId, JSON.stringify(true));
                  });
                }
              } else {
                if (window.Alpine) {
                  _this.close();
                  localStorage.setItem(data.name + '-' + data.sectionId, JSON.stringify(false));
                } else {
                  document.addEventListener('alpine:initialized', () => {
                    _this.close();
                    localStorage.setItem(data.name + '-' + data.sectionId, JSON.stringify(false));
                  });
                }
              }
            }

            // select section popup
            document.addEventListener('shopify:section:select', (event) => {
              handlePopupSelect(event);
            });
  
            // select block popup
            document.addEventListener('shopify:block:select', (event) => {
              handlePopupSelect(event);
            });
          }
  
          if (this.$el.querySelector('.newsletter-message')) {
            this.open();
            return;
          }
        },
        load() {
          if (!data.showOnMobile && window.innerWidth < 768 || window.location.pathname === '/challenge') return;
          if (Shopify.designMode) {
            this.open();
          } else {
            if (data.name == 'popup-promotion' && !this.handleSchedule() && data.showCountdown) return;
  
            setTimeout(() => {
              this.open();
            }, data.delays * 1000);
          }
        },
        open() {
          if (!Shopify.designMode && !this.getExpire() && !this.show) {
            requestAnimationFrame(() => {
              this.show = false;
            });

            return;
          }
  
          if (data.name == 'popup-age-verification') {
            if (this.getExpire() && !Shopify.designMode && !data.show_popup) return;

            requestAnimationFrame(() => {
              document.body.classList.add("overflow-hidden");
              Alpine.store('xPopup').open = true;
            });
          }
  
          requestAnimationFrame(() => {
            this.show = true;
          });
        },
        close() {
          if (!Shopify.designMode && this.getExpire()) this.setExpire();
          requestAnimationFrame(() => {
            this.show = false;
          });
          
          if (data.name == 'popup-age-verification') {
            requestAnimationFrame(() => {
              document.body.classList.remove("overflow-hidden");
              Alpine.store('xPopup').open = false;
            });
          }
        },
        toggle() {
          if (this.inMotion) return;

          requestAnimationFrame(() => {
            this.show = !this.show;
            this.inMotion = true;

            setTimeout(() => {
              this.inMotion = false;
            }, 500);
          });
        },
        setExpire() {
          const item = {
            section: data.sectionId,
            expires: Date.now() + this.delayDays * 24 * 60 * 60 * 1000
          }
          
          localStorage.setItem(data.sectionId, JSON.stringify(item))
        },
        getExpire() {
          const item = xParseJSON(localStorage.getItem(data.sectionId));
          if (item == null) return true;

          if (Date.now() > item.expires) {
            localStorage.removeItem(data.sectionId);
            return true;
          }

          return false;
        },
        handleSchedule() {
          if (data.showCountdown) {
            let el = document.getElementById('x-promotion-' + data.sectionId);
            let settings = xParseJSON(el.getAttribute('x-countdown-data'));
            if (!Alpine.store('xHelper').canShow(settings)) {
              if (!Shopify.designMode && data.schedule_enabled) {
                requestAnimationFrame(() => {
                  this.show = false;
                });

                return false;
              }
            }
          }

          this.enable = true;
          return true;
        }
      }));
    });
  });
}