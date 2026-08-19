document.addEventListener('DOMContentLoaded', function(){
	const body = document.body;
	function setHoverState(e){
		const btn = e.currentTarget;
		if(btn.classList.contains('btn-dark')){
			body.classList.add('hovering-dark');
		} else {
			body.classList.add('hovering-light');
		}
	}
	function clearHoverState(){
		document.body.classList.remove('hovering-dark','hovering-light');
	}
	document.querySelectorAll('.btn, .btn-dark').forEach(btn=>{
		btn.addEventListener('mouseenter', setHoverState);
		btn.addEventListener('focus', setHoverState);
		btn.addEventListener('mouseleave', clearHoverState);
		btn.addEventListener('blur', clearHoverState);
	});

    // Mobile nav toggle
    const nav = document.querySelector('nav');
    const menuToggle = document.querySelector('.menu-s');
    if(nav && menuToggle){
        const menuIcon = menuToggle.querySelector('.fa');
        function setMenuState(isOpen) {
            nav.classList.toggle('open', isOpen);
            body.classList.toggle('sidebar-open', isOpen);
            menuToggle.setAttribute('aria-expanded', String(isOpen));
            if (menuIcon) {
                menuIcon.classList.toggle('fa-bars', !isOpen);
                menuIcon.classList.toggle('fa-xmark', isOpen);
            }
        }
        menuToggle.addEventListener('click', function(e){
            e.preventDefault();
            setMenuState(!nav.classList.contains('open'));
        });

        nav.querySelectorAll('.menu-l').forEach(link => link.addEventListener('click', () => {
            setMenuState(false);
        }));

        document.addEventListener('keydown', function(e){
            if(e.key === 'Escape'){
                setMenuState(false);
            }
        });

        document.addEventListener('click', function(e) {
            if (nav.classList.contains('open') && !nav.contains(e.target)) {
                setMenuState(false);
            }
        });
    }

    const authDialog = document.querySelector('#auth-dialog');
    if (authDialog) {
        const title = authDialog.querySelector('#auth-title');
        const intro = authDialog.querySelector('.auth-dialog__intro');
        const message = authDialog.querySelector('.auth-dialog__message');
        const forms = authDialog.querySelectorAll('[data-auth-form]');
        const tabs = authDialog.querySelectorAll('[data-auth-tab]');

        function setAuthView(view) {
            const isLogin = view === 'login';
            authDialog.dataset.authView = view;
            title.textContent = isLogin ? 'Welcome back' : 'Create your account';
            intro.textContent = isLogin
                ? 'Sign in to manage saved properties and private consultations.'
                : 'Join Jetland to save properties and receive curated opportunities.';
            forms.forEach(form => { form.hidden = form.dataset.authForm !== view; });
            tabs.forEach(tab => tab.setAttribute('aria-selected', String(tab.dataset.authTab === view)));
            message.textContent = '';
        }

        document.querySelectorAll('[data-auth-open]').forEach(button => {
            button.addEventListener('click', () => {
                if (nav && nav.classList.contains('open') && menuToggle) menuToggle.click();
                setAuthView(button.dataset.authOpen);
                authDialog.showModal();
            });
        });
        tabs.forEach(tab => tab.addEventListener('click', () => setAuthView(tab.dataset.authTab)));
        authDialog.querySelector('.auth-dialog__close').addEventListener('click', () => authDialog.close());
        authDialog.addEventListener('click', event => {
            if (event.target === authDialog) authDialog.close();
        });
        forms.forEach(form => form.addEventListener('submit', event => {
            event.preventDefault();
            const submitButton = form.querySelector('button[type="submit"]');
            const originalLabel = submitButton.innerHTML;
            const endpoint = form.dataset.authForm === 'login' ? '/api/auth/login' : '/api/auth/register';
            const values = Object.fromEntries(new FormData(form));
            submitButton.disabled = true;
            submitButton.textContent = 'Please wait…';
            message.textContent = '';
            fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values)
            }).then(async response => {
                const payload = await response.json();
                if (!response.ok) throw new Error(payload.message || 'Unable to complete your request.');
                sessionStorage.setItem('jetland-token', payload.token);
                sessionStorage.setItem('jetland-user', JSON.stringify(payload.user));
                message.textContent = payload.message;
                form.reset();
                setTimeout(() => authDialog.close(), 900);
            }).catch(error => {
                message.textContent = error.message;
            }).finally(() => {
                submitButton.disabled = false;
                submitButton.innerHTML = originalLabel;
            });
        }));
    }

    const propertyDialog = document.querySelector('#property-dialog');
    if (propertyDialog) {
        let properties = [];
        let propertiesLoaded = false;
        const search = propertyDialog.querySelector('#property-search');
        const results = propertyDialog.querySelector('#property-results');
        const count = propertyDialog.querySelector('.property-results-count');
        const filters = propertyDialog.querySelectorAll('[data-property-category]');
        let activeCategory = 'All';

        async function loadProperties() {
            if (propertiesLoaded) return;
            const response = await fetch('/api/properties');
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.message || 'Unable to load properties.');
            properties = payload.properties;
            propertiesLoaded = true;
        }

        async function renderProperties() {
            if (!propertiesLoaded) {
                count.textContent = 'Loading properties…';
                results.innerHTML = '';
                try {
                    await loadProperties();
                } catch (error) {
                    count.textContent = '';
                    results.innerHTML = `<p class="property-results__empty">${error.message}</p>`;
                    return;
                }
            }
            const query = search.value.trim().toLowerCase();
            const filtered = properties.filter(property => {
                const matchesCategory = activeCategory === 'All' || property.category === activeCategory;
                const matchesQuery = `${property.name} ${property.price} ${property.category}`.toLowerCase().includes(query);
                return matchesCategory && matchesQuery;
            });
            count.textContent = `${filtered.length} ${filtered.length === 1 ? 'property' : 'properties'} available`;
            results.innerHTML = filtered.length ? filtered.map(property => `
                <article class="property-result-card">
                    <img src="dist/img/${property.image}" alt="${property.name}">
                    <div class="property-result-card__body">
                        <span>${property.category}</span>
                        <h3>${property.name}</h3>
                        <p>${property.price}</p>
                    </div>
                </article>`).join('') : '<p class="property-results__empty">No properties match your search.</p>';
        }

        document.querySelectorAll('[data-property-browser]').forEach(button => button.addEventListener('click', () => {
            propertyDialog.showModal();
            search.focus();
            renderProperties();
        }));
        propertyDialog.querySelector('.property-dialog__close').addEventListener('click', () => propertyDialog.close());
        propertyDialog.addEventListener('click', event => {
            if (event.target === propertyDialog) propertyDialog.close();
        });
        search.addEventListener('input', renderProperties);
        filters.forEach(filter => filter.addEventListener('click', () => {
            activeCategory = filter.dataset.propertyCategory;
            filters.forEach(item => item.classList.toggle('is-active', item === filter));
            renderProperties();
        }));
        renderProperties();
    }

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => navigator.serviceWorker.register('sw.js'));
    }
});
