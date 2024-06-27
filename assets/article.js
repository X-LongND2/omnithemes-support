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
                if (document.querySelector('.menu-article .active')) {
                  document.querySelector('.menu-article .active').classList.remove("active");
                }
                document.querySelectorAll('.item-menu-article')[entry.target.dataset.index].classList.add("active");
              }
            });
          }, { rootMargin: '0px 0px -60% 0px' });
          if (document.querySelectorAll('article h2, article h3').length > 1) {
            document.querySelectorAll('article h2, article h3').forEach((heading, index) => {
              heading.dataset.index = index;
              observer.observe(heading);
            });
          } else {
            document.querySelector('.menu-article').remove()
          }
          if(window.location.href.split('#index=')[1]) {
            this.scrollTop(null,window.location.href.split('#index=')[1].slice(0,1))
          }
        },
        loadData(el) {
          const heading2 = document.querySelectorAll('article h2, article h3');
          let url = window.location.href
          if (heading2.length > 1) {
            heading2.forEach((item, index) => {
              if(url.split('#index=')[1]) {
                url = url.split('#index=')[0] + '#index='+ index + url.split('#index=')[1].slice(1);
              }else {
                url = url + '#index='+ index;
              }
              let htmlContent = "<li class='item-menu-article w-full cursor-pointer pb-2 "+ (item.tagName == 'H3' ? 'pl-3' : '') +"' @click='scrollTop($el," + index + ")' ><a href='" + url +"'>" + item.textContent + "</a></li>";
              document.querySelector('.list-menu-article').innerHTML += htmlContent;
              if (index === heading2.length - 1) {
                setTimeout(() => {
                  const outlineHeight = window.getComputedStyle(el).height
                  if (document.body.clientWidth < 1024) {
                    const pageBody = document.querySelector('.page__body')
                    pageBody.style.marginTop = `calc(${Number(outlineHeight.slice(0, outlineHeight.length - 2))}px)`
                  }
                }, 100)
              }
            })
          }
          else {
            document.querySelector('.menu-article').remove();
          }

          if (document.body.clientWidth >= 1024) {
            el.style.marginTop = document.querySelector(".page__body").offsetTop + 30 + "px";
          }
          else {
            const cssOutline = () => {
              el.style.display = 'block'
              const getElementDocumentOffset = (element) => {
                const rect = element.getBoundingClientRect()
                const scrollTop = window.scrollY
                return rect.top + scrollTop
              }
              const pageTitle = document.querySelector('.page__title')

              const pageContainer = document.querySelector('.page__container')
              const pageTitleHeight = window.getComputedStyle(pageTitle).height
              const outlinePos = getElementDocumentOffset(pageTitle) - getElementDocumentOffset(pageContainer) + Number(pageTitleHeight.slice(0, pageTitleHeight.length - 2))
              el.style.top = `calc(${outlinePos}px + 1rem)`
              if (window.innerWidth >= 768) {
                el.style.marginLeft = '20px'
              }
              el.style.padding = '0px 20px'
            }
            const resizeObserver = new ResizeObserver((entries) => {
              cssOutline()
            })
            resizeObserver.observe(document.querySelector('.theme-template-article'));
            cssOutline()
          }
        },
        scrollTop(el, index) {
          if (document.querySelectorAll('article h2, article h3').length > index) {
            if (document.querySelector('.menu-article .active')) {
              document.querySelector('.menu-article .active').classList.remove("active");
            }
            if(el) {
              el.classList.add("active");
            }
            document.querySelectorAll('article h2, article h3')[index].scrollIntoView({ behavior: "smooth" });
          }
        }
      }));
    })
  });
}