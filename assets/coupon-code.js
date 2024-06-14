if (!window.Eurus.loadedScript.includes('coupon-code.js')) {
  window.Eurus.loadedScript.push('coupon-code.js');
  
  requestAnimationFrame(() => {
    document.addEventListener("alpine:init", () => {
      Alpine.data("xCounponCode", () => ({
        coppySuccess: false,
        copyCode() {
          if (this.coppySuccess) return;

          const discountCode = this.$refs.code_value.textContent.trim();
          navigator.clipboard.writeText(discountCode).then(
            () => {
              this.coppySuccess = true;

              setTimeout(() => {
                this.coppySuccess = false;
              }, 5000);
            },
            () => {
              alert('Copy fail');
            }
          );
        } 
      }));
    });
  });
}