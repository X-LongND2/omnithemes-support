if (!window.Eurus.loadedScript.includes('locales-form.js')) {
  window.Eurus.loadedScript.push('locales-form.js');

  requestAnimationFrame(() => {
    document.addEventListener('alpine:init', () => {
      Alpine.data('xLocalizationForm', () => ({ 
        submit(value, input) {
          document.getElementById(input).value = value;
          document.getElementById('localization_form').submit();
        }
      }))
    });
  });
}