if (!window.Eurus.loadedScript.includes('article.js')) {
  window.Eurus.loadedScript.push('article.js');

  requestAnimationFrame(() => {
    document.addEventListener('alpine:init', () => {
      Alpine.data('xArticle', () => ({
        init() {
          const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
              // If heading is in the top 30% of the screen
              if (entry.isIntersecting) {
                  if(document.querySelector('.menu-article .active')) {
                    document.querySelector('.menu-article .active').classList.remove("active");
                  }
                document.querySelectorAll('.item-menu-article')[entry.target.dataset.index].classList.add("active");
              }
            });
          }, {rootMargin: '0px 0px -60% 0px'});
          if(document.querySelectorAll('article h2, article h3').length > 1 ) {
            document.querySelectorAll('article h2, article h3').forEach((heading, index) => {
              heading.dataset.index = index;
              observer.observe(heading);
            });
          }else {
            document.querySelector('.menu-article').remove()
          }
        },
        loadData(el) {
          if (window.innerWidth > 767) {
            el.style.marginTop = document.querySelector(".page__body").offsetTop + 30 +"px";
          }
          const heading2 = document.querySelectorAll('article h2, article h3');
          if(heading2.length > 1 ) {
            heading2.forEach((item, index) => {
              let htmlContent = "<li class='item-menu-article w-full cursor-pointer pb-2 "+ (item.tagName == 'H3' ? 'pl-3' : '') +"' @click='scrollTop($el," + index + ")' >" + item.textContent + "</li>";
              document.querySelector('.list-menu-article').innerHTML += htmlContent;
            })
          }
        },
        scrollTop(el,index) {
          if(document.querySelectorAll('article h2, article h3').length > index) {
            if(document.querySelector('.menu-article .active')) {
              document.querySelector('.menu-article .active').classList.remove("active");
            }
            el.classList.add("active");
            document.querySelectorAll('article h2, article h3')[index].scrollIntoView({ behavior: "smooth" });
          }
        }
      }));
    })
  });
}