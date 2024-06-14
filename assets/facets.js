document.addEventListener('alpine:init', () => {
  Alpine.data('xFiltersAndSortby', (sectionId) => ({
    t: '',
    show: false,
    showFilterAside: true,
    loading: false,
    isDesktop: false,
    listLayout: false,
    cachedResults: [],
    searchParamsPrev: window.location.search.slice(1),
    searchParamsInitial: window.location.search.slice(1),
    init() {
      if (localStorage.getItem("list-layout") == 'list') {
        this.listLayout = true;
      }
      this._initLayout();
      this._setListeners();
    },
    _initLayout() {
      let formAside = document.getElementsByClassName('form-aside')[0];
      let formDrawer = document.getElementsByClassName('form-drawer')[0];
      if (window.innerWidth > 767) {
        this.isDesktop = true;
        if (formAside) {
          formAside.setAttribute('id','FacetFiltersForm');
          if (formDrawer) formDrawer.removeAttribute('id');
        } else {
          if (formDrawer) formDrawer.setAttribute('id','FacetFiltersForm');
        }
      } else {
        this.isDesktop = false;
        if (formAside) formAside.removeAttribute('id');
        if (formDrawer) formDrawer.setAttribute('id','FacetFiltersForm');
      }
    },
    _setListeners() {
      const onHistoryChange = (event) => {
        const searchParams = event.state ? event.state.searchParams : this.searchParamsInitial;
        if (searchParams === this.searchParamsPrev) return;
        this._renderPage(searchParams, false);
      }
      window.addEventListener('popstate', onHistoryChange);

      installMediaQueryWatcher('(min-width: 768px)', this._initLayout);
    },
    toggleLayout(theBoolean) {
      this.listLayout = theBoolean;
      localStorage.setItem("list-layout", theBoolean ? "list" : "grid" );
    },
    removeFilter(url) {
      this._reloadFilter(url);
    },
    renderPagination() {
      var formData = {
        'attributes': {
          'collection-pagination': this.$el.value             
        }
      }; 
      fetch(Shopify.routes.root+'cart/update', {
        method:'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(formData)
      }).then(() => {
        this.cachedResults = [];
        const searchParams = this._createSearchParams(document.getElementById('FacetFiltersForm'));
        this._renderPage(searchParams);
      }); 
    },
    onSubmit(wait = 500) {
      clearTimeout(this.t);

      const func = () => {
        const searchParams = this._createSearchParams(document.getElementById('FacetFiltersForm'));
        this._renderPage(searchParams);
        if(this.isDesktop) document.getElementById('FormSelectFilter').blur();
      }
      
      this.t = setTimeout(() => {
        func();
      }, wait);
    },
    rangePrice(el) {
      const rangeInput = el.querySelectorAll(".range-input input"),
      priceInput = el.querySelectorAll(".price-input"),
      pricePreview = el.querySelectorAll(".price-preview"),
      range = el.querySelector(".slider .progress");
      let priceGap = 1;

      rangeInput.forEach((input) => {
        input.addEventListener("input", (e) => {
          e.preventDefault();
          let minVal = parseInt(rangeInput[0].value),
            maxVal = parseInt(rangeInput[1].value);
          
          if (maxVal - minVal < priceGap) {
            if (e.target.className === "range-min") {
              rangeInput[0].value = maxVal - priceGap;
              priceInput[0].value = maxVal - priceGap;
            } else {
              rangeInput[1].value = minVal + priceGap;
              priceInput[1].value = maxVal + priceGap;
            }
          } else {
            priceInput[0].value = minVal;
            priceInput[1].value = maxVal;
            range.style.left = (minVal / rangeInput[0].max) * 100 + "%";
            range.style.right = 100 - (maxVal / rangeInput[1].max) * 100 + "%";
          }
          pricePreview[0].textContent = minVal;
          pricePreview[1].textContent = maxVal;
        });
      });
    },
    initRange(el) {
      const rangeInput = el.querySelectorAll(".range-input input"),
      range = el.querySelector(".slider .progress");
      
      let minVal = parseInt(rangeInput[0].value),
      maxVal = parseInt(rangeInput[1].value);
      range.style.left = (minVal / rangeInput[0].max) * 100 + "%";
      range.style.right = 100 - (maxVal / rangeInput[1].max) * 100 + "%";
    },
    _reloadFilter(url) {
      const searchParams = url.indexOf('?') == -1 ? '' : url.slice(url.indexOf('?') + 1);
      this._renderPage(searchParams);
    },
    _createSearchParams(form) {
      const formData = new FormData(form);
      return new URLSearchParams(formData).toString();
    },
    _updateURLHash(searchParams) {
      history.pushState({ searchParams }, '', `${window.location.pathname}${searchParams && '?'.concat(searchParams)}`);
    },
    _renderPage(searchParams, updateURLHash = true) {
      this.searchParamsPrev = searchParams;
      this.loading = true;
      
      if (this.cachedResults[searchParams]) {
        this._renderResults(this.cachedResults[searchParams]);
        return;
      }

      const url = `${window.location.pathname}?section_id=${sectionId}&${searchParams}`;
      fetch(url)
        .then(response => response.text())
        .then((responseText) => {
          const html = responseText;
          this.cachedResults[searchParams] = html;
          this._renderResults(html);
        });

      if (updateURLHash) this._updateURLHash(searchParams);
    },
    _renderResults(html) {
      this._renderFilters(html);
      this._renderProductGridContainer(html);
      this._renderProductCount(html);
      this.loading = false;
    },
    _renderFilters(html) {
      const parsedHTML = new DOMParser().parseFromString(html, 'text/html');
      const facetDetailsElements =
        parsedHTML.querySelectorAll('.js-filter');
      const matchesIndex = (element) => {
        const jsFilter = !this.$el.classList.contains('facet-reset') ? this.$el.closest('.js-filter') : undefined;
        return jsFilter ? element.dataset.index === jsFilter.dataset.index : false;
      }
      const facetsToRender = Array.from(facetDetailsElements).filter(element => !matchesIndex(element));
      const countsToRender = Array.from(facetDetailsElements).find(matchesIndex);
      facetsToRender.forEach((element) => {
        document.querySelector(`.js-filter[data-index="${element.dataset.index}"]`).innerHTML = element.innerHTML;
      });

      this._renderActiveFacets(parsedHTML);
      this._renderAdditionalElements(parsedHTML);

      if (countsToRender) this._renderCounts(countsToRender, this.$el .closest('.js-filter'));
    },
    _renderProductGridContainer(html) {
      document.getElementById('ProductGridContainer').innerHTML = new DOMParser().parseFromString(html, 'text/html').getElementById('ProductGridContainer').innerHTML;
    },
    _renderProductCount(html) {
      const productCountEl = new DOMParser().parseFromString(html, 'text/html').getElementById('ProductCount');
      if (productCountEl) {
        const count = productCountEl.innerHTML;
        const container = document.getElementById('ProductCount_header');
        const containerDrawer = document.getElementById('ProductCountDrawer');
        if (container) container.innerHTML = count;
        if (containerDrawer) containerDrawer.innerHTML = count;
        container.classList.remove('loading');
      }
    },
    _renderActiveFacets(html) {
      const filterTag = document.getElementById('active-filter-tag');
      const filterTagMobile = document.getElementById('active-filter-tag-mobile');
      if (filterTag) filterTag.innerHTML = html.getElementById('active-filter-tag').innerHTML;
      if (filterTagMobile) filterTagMobile.innerHTML = html.getElementById('active-filter-tag-mobile').innerHTML;
    },
    _renderAdditionalElements(html) {
      const container = document.getElementById('ProductPerPage');
      if (container) container.innerHTML = html.getElementById('ProductPerPage').innerHTML;
    },
    _renderCounts(source, target) {
      const targetElement = target.querySelector('.facets__selected');
      const sourceElement = source.querySelector('.facets__selected');
  
      const targetElementAccessibility = target.querySelector('.facets__summary');
      const sourceElementAccessibility = source.querySelector('.facets__summary');
  
      if (sourceElement && targetElement) {
        target.querySelector('.facets__selected').outerHTML = source.querySelector('.facets__selected').outerHTML;
      }
  
      if (targetElementAccessibility && sourceElementAccessibility) {
        target.querySelector('.facets__summary').outerHTML = source.querySelector('.facets__summary').outerHTML;
      }
    },
    _filterFocus() {
      Alpine.store('xFocusElement').trapFocus('ProductFilter','CloseFilter');
    },
    _filterRemoveFocus() {
      const activeElement = document.getElementById('btn-filter');
      Alpine.store('xFocusElement').removeTrapFocus(activeElement);
    },
    setFilterHeaderHeight() {
      document.documentElement.style.setProperty('--height-sticky-filter',document.getElementById("FacetsWrapperDesktop").offsetHeight + "px");
    },
    setPositionOptionFilter(el) {
      elRect = el.getBoundingClientRect();
      const elPopup = el.getElementsByClassName('popup-above')[0];
      let spacingRight = window.innerWidth - elRect.left;
      let checkSpacing = spacingRight - 320;
      if (checkSpacing >= 0) {
        elPopup.style.left = '0px';
      } else {
        elPopup.style.left = checkSpacing+ 'px';
      }
    }
  }));
});