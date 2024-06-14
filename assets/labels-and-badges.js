requestAnimationFrame(() => {
  document.addEventListener('alpine:init', () => {
    Alpine.store('xBadges', {
      fixedPositionTemplate: `<div
        class="x-badge-{label-id} x-badge-container pointer-events-none{container-img-class}"
        {preview-show-condition}
      >
        {content}
      </div>`,
      customPositionTemplate: `<div
        class="x-badge-{label-id} x-badge-container min-w-fit max-w-full max-h-full bottom-0 pointer-events-none{container-css-class}"
        x-data="{
          contentHeight: 0,
          rePosition() {
            this.$nextTick(() => {
              this.contentHeight = this.$refs.content ? this.$refs.content.offsetHeight : contentHeight;
            });
          }
        }"
        x-intersect.once="rePosition();
          if (Shopify.designMode) {
            window.addEventListener('resize', () => {
              if ($store.xBadges.lastWindowWidth != window.innerWidth) {
                rePosition();
              }
            });
          } else {
            installMediaQueryWatcher('(min-width: 768px)', (matches) => rePosition());
          }"
        {preview-show-condition}
        :style="'{css-position} min-height: ' + contentHeight + 'px'"
      >
        {content}
      </div>`,
      productDetailTemplate: `<div
        class="x-badge-{label-id} x-badge-container min-w-fit max-w-full max-h-full bottom-0 pointer-events-none{container-css-class}{container-img-class}"
      >
        {content}
      </div>`,
      previewActiveBlock: window.xBadgesPreviewActiveBlock,
      init() {
        if (Shopify.designMode) {
          document.addEventListener('shopify:block:select', (event) => {
            if (!event.target.classList.contains('x-badges-block-preview')) return;

            let blockData = xParseJSON(event.target.getAttribute('data-shopify-editor-block'));
            this.previewActiveBlock = blockData.id;
            window.xBadgesPreviewActiveBlock = blockData.id;

            document.dispatchEvent(new CustomEvent("eurus:badges:block-select"));
          });
        }
      },
      load(el, callback = () => {}, container = null) {
        if (container) el.container = container;

        const sliderEl = el.closest('[x-data-slider]');
        if (sliderEl) {
          if (!sliderEl.classList.contains('is-initialized')) {
            const sectionId = el.closest('[x-data-slider]').getAttribute('x-data-slider');
            document.addEventListener(`eurus:${sectionId}:splide-ready`, () => {
              this.doLoad(el, callback);
            });
          } else {
            this.doLoad(el, callback);
          }
        } else {
          this.doLoad(el, callback);
        }
      },
      doLoad(el, callback = () => {}) {
        this.initAllLabels(el);

        if (Shopify.designMode) {
          let productData = xParseJSON(el.getAttribute('x-labels-data'));
          document.addEventListener('shopify:section:load', () => {
            if (productData && !productData.isXBadgesPreview) {
              this.initAllLabels(el);
            }
          });
        }

        callback(el);
      },
      initAllLabels(el) {
        let productData = xParseJSON(el.getAttribute('x-labels-data'));

        if (!productData) return;

        if (Shopify.designMode) {
          let currentLabels = el.getElementsByClassName('x-badge-container');
          if (currentLabels.length > 0) {
            const labelsNum = currentLabels.length;
            for (let i=0;i<labelsNum;i++) {
              currentLabels[0].remove();
            }
          }
        }

        let allLabels = document.getElementsByClassName('x-badges-block-data');
        for (let i = 0;i < allLabels.length;i++) {
          let label = xParseJSON(allLabels[i].getAttribute('x-badges-block-data'));
          if (!label.enable && !productData.isXBadgesPreview) return;
          
          label.settings.icon = allLabels[i].getAttribute('x-badges-icon');
          this.appendLabel(el, label, productData);
        }

        el.removeAttribute('x-labels-data');
      },
      appendLabel(el, label, productData) {
        if (productData.container == 'product-info' || label.settings.position == 'custom') {
          el.innerHTML += this.processTemplate(el, label, productData);
          return;
        }

        let container = el.querySelector(`.${label.settings.position}-container`);
        if (!container) {
          container = this.createFixedPositionContainer(label.settings.position);
          el.appendChild(container);
        }

        container.innerHTML += this.processTemplate(el, label, productData);
      },
      createFixedPositionContainer(position) {
        let HTMLClass = `${position}-container absolute gap-1 space-y-1`;
        HTMLClass += position.includes('top') ? ' top-1 flex-col' : ' bottom-1 flex-col-reverse';
        HTMLClass += position.includes('left') ? ' left-1' : ' right-1';

        container = document.createElement("div");
        container.setAttribute('class', HTMLClass);

        return container;
      },
      processContent(el, label, productData) {
        let content = false;
        const canShow = this.canShow(label, productData);

        if (label.settings.image && canShow) {
          /** image label */
          let imageHeight, imageWidth;
          if (productData.container == 'product-info') {
            imageHeight = 126;
            imageWidth = Math.round(imageHeight * label.settings.image_aspect_ratio);
          } else {
            imageWidth = label.settings.size * 15;
            imageHeight = imageWidth / label.settings.image_aspect_ratio;
          }
          let image;
          if (label.settings.image.src) {
            image = label.settings.image.src.includes('burst.shopifycdn.com') ? label.settings.image.src : 
            label.settings.image.src + `&width=` + (imageWidth * 2);
          } else {
            image = label.settings.image.includes('burst.shopifycdn.com') ? label.settings.image : 
            label.settings.image + `&width=` + (imageWidth * 2);
          }
          const imageDirection = label.settings.horizontal_position > 50
                                  && productData.container == "card" ? "justify-end" : "justify-start";
          content = `<div x-ref="content" class='x-badge-content flex ${imageDirection}{css-opacity}'>
            <img 
              loading="lazy"
              width="` + imageWidth + `"
              height="` + imageHeight + `"
              alt="` + (label.settings.image_alt.length > 0 ? label.settings.image_alt : productData.title) + `"
              src="` + image + `"
            />
          </div>`;
        } else if (label.settings.content && canShow) {
          /** text label */
          let qty = (productData.inventory_management.length < 1 || productData.qty < 0) ? '' : productData.qty
          let saleAmount = productData.sale_amount.includes('-') ? '' : productData.sale_amount;
          let countDown = label.settings.schedule_enabled ? '<span class="x-badge-countdown-' + label.id + ' label-countdown"></span>' : '';
          let sale = Math.ceil((productData.compare_at_price - productData.price) * 100 / productData.compare_at_price);
          sale = sale > 0 ? sale + '%' : '';

          content = label.settings.content.replace(/{sale}/gi, sale)
                      .replace(/{sale_amount}/gi, saleAmount)
                      .replace(/{qty}/gi, qty)
                      .replace(/{count_down}/gi, countDown);

          const padding = label.settings.size / 2;
          const sizeClass = productData.container == 'product-info' ? '' : ` pt-${padding} pb-${padding} pl-${padding + 1.5} pr-${padding + 1.5}`;
          const inlineStyle = productData.container == 'product-info' ? '' : `style="font-size: ${label.settings.font_size}rem;"`;
          const inlineStyleIcon = productData.container == 'product-info' ? '' : `style="height: ${label.settings.font_size}rem; width: ${label.settings.font_size}rem;"`;
          content = content.length > 0
            ? `<div
                x-ref="content"
                class='x-badge-content x-badge-text select-none inline-flex justify-center${sizeClass} items-center{css-opacity}{css-type}'
                ${inlineStyle}
              ><span class="mr-2 icon-label empty:hidden" ${inlineStyleIcon}>${label.settings.icon}</span><span class="leading-normal w-fit p-break-words">${content}</span></div>` : false;

          if (countDown.length > 0 && label.settings.schedule_enabled) {
            Alpine.store('xHelper').countdown(label.settings, function(canShow, seconds, minutes, hours, days) {
              let container = el.container ? el.container : el;
              const countdownElements = container.getElementsByClassName('x-badge-countdown-' + label.id);

              if (!canShow) {
                for (let i = 0;i < countdownElements.length;i++) {
                  countdownElements[i].innerHTML = '';
                }

                return;
              }

              days = days > 0 ? days + "D&nbsp;&nbsp;&nbsp;" : "";
              hours = hours == 0 && days.length == 0 ? "" : hours + " : ";
              const timeLeft = days + hours + minutes + " : " + seconds;

              for (let i = 0;i < countdownElements.length;i++) {
                countdownElements[i].innerHTML = timeLeft;
              }
            });
          }
        }

        return content;
      },
      processTemplate(el, label, productData) {
        let template = '';
        if (content = this.processContent(el, label, productData)) {
          const cssOpacity = " opacity-" + label.settings.opacity;
          const widthPosition = label.settings.horizontal_position > 50 ?
                                  label.settings.horizontal_position : (100 - label.settings.horizontal_position);
          const cssPosition = productData.container == "card" ? "width: " + widthPosition + "%;"
                            + " height: " + (100 - label.settings.vertical_position) + "%;"
                            : "";
          const cssType = label.settings.type == 'round' ? ' rounded-md' : '';

          let containerCssClass = productData.container == "card" ? " absolute" : "";
          containerCssClass += label.settings.horizontal_position > 50 ? " left-0 text-end" : " right-0 text-start";
          const previewShowCondition = productData.isXBadgesPreview ? `x-show="$store.xBadges.previewActiveBlock == '{label-id}'"` : '';
          const imgClass = label.settings.image ? ' label-img' : '';

          template = this.getLableTemplate(productData.container, label.settings.position);
          template = template.replace('{preview-show-condition}', previewShowCondition)
            .replace('{content}', content)
            .replace('{css-opacity}', cssOpacity)
            .replace('{css-position}', cssPosition)
            .replace('{css-type}', cssType)
            .replace('{container-css-class}', containerCssClass)
            .replace('{container-img-class}', imgClass)
            .replace(/{label-id}/gi, label.id);
        }

        return template;
      },
      getLableTemplate(container, position) {
        if (container == 'product-info') {
          return this.productDetailTemplate;
        } else if (position == 'custom') {
          return this.customPositionTemplate;
        }

        return this.fixedPositionTemplate;
      },
      canShow(label, productData) {
        if (productData.isXBadgesPreview) {
          return true;
        }

        if (productData.container == 'card' && !label.settings.show_on_product_card) {
          return false;
        }

        if (productData.container == 'product-info' && !label.settings.show_on_product_page) {
          return false;
        }

        if (label.type == "sale-label" && productData.compare_at_price > productData.price) {
          return true;
        }

        if (label.type == "sold-out-label" && !productData.available) {
          return true;
        }

        if (label.settings.schedule_enabled) {
          let endDate = new Date(
            label.settings.end_year,
            label.settings.end_month - 1,
            label.settings.end_day,
            label.settings.end_hour,
            label.settings.end_minute
          );
          label.endTime = endDate.getTime()
            + (-1 * label.settings.timezone * 60 - endDate.getTimezoneOffset()) * 60 * 1000;
  
          let startDate = new Date(
            label.settings.start_year,
            label.settings.start_month - 1,
            label.settings.start_day,
            label.settings.start_hour,
            label.settings.start_minute
          );
          label.startTime = startDate.getTime()
            + (-1 * label.settings.timezone * 60 - startDate.getTimezoneOffset()) * 60 * 1000;

          let now = new Date().getTime();
          if (label.endTime < now) {
            return false;
          }

          if (label.startTime > now) {
            return false;
          }
        }

        if (label.settings.applied_products.includes(productData.id)) {
          return true;
        }

        for(let i=0;i<label.settings.applied_collections.length;i++) {
          if (productData.collections.includes(label.settings.applied_collections[i])) {
            return true;
          }
        }

        if (label.type != "sale-label"
          && label.type != "sold-out-label"
          && label.settings.applied_products.length == 0
          && label.settings.applied_collections.length == 0) {
          return true;
        }

        return false;
      }
    });
  });
});
