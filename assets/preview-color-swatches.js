if (!window.Eurus.loadedScript.includes('preview-color-swatches.js')) {
  window.Eurus.loadedScript.push('preview-color-swatches.js');

  requestAnimationFrame(() => {
    document.addEventListener('alpine:init', () => {
      Alpine.store('xPreviewColorSwatch', {
        updateImage(el, src, variantId) {
          const getLink = el.getAttribute("link-variant");
          const cardProduct = el.closest('.card-product');

          if (!cardProduct) return;
          const linkVariant = cardProduct.getElementsByClassName("link-product-variant");
          for (var i = 0; i < linkVariant.length; i ++) {
            linkVariant[i].setAttribute("href", getLink);
          }

          if (src != '') {
            const previewImg = cardProduct.getElementsByClassName("preview-img")[0];
            if (!previewImg) return;
            previewImg.removeAttribute("srcset");
            previewImg.setAttribute("src", src);
          }

          const btnQuickview = cardProduct.getElementsByClassName("button--quickview");
          if (btnQuickview) {
            for (let i = 0; i < btnQuickview.length; i++) {
              btnQuickview[i].setAttribute('data-variant', variantId);
            }
          }
        }
      });
    })
  });
}    