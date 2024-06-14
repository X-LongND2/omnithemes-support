if (!window.Eurus.loadedScript.includes('payment-button.js')) {
  window.Eurus.loadedScript.push('payment-button.js');

  requestAnimationFrame(() => {
    document.addEventListener('alpine:init', () => {
      Alpine.store('xShopifyPaymentBtn', {
        load(e) {
          (events => {
            const init = () => {
              events.forEach(type => window.removeEventListener(type, init));
  
              e.innerHTML = e.getAttribute('data-shopify-payment-button');
              e.removeAttribute('data-shopify-payment-button');
              Shopify.PaymentButton.init();
            }
          
            events.forEach(type => window.addEventListener(type, init, {once: true, passive: true}));
          })(['touchstart', 'mouseover', 'wheel', 'scroll', 'keydown']);
        },
      });
    });
  });
}