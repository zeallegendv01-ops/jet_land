'use client';

import { useEffect, useMemo, useState } from 'react';

const fallbackProperties = [
  { id: '1', name: 'Transcorp Estate', price: '₦300,000,000', category: 'Luxury', image: 'img1.jpeg', location: 'Abuja', featured: true },
  { id: '2', name: '5Star Estate', price: '₦40,000,000', category: 'Residential', image: 'img2.jpg', location: 'Lagos' },
  { id: '3', name: 'Aso Rock Estate', price: '₦69,000,000', category: 'Luxury', image: 'img3.png', location: 'Abuja' },
  { id: '4', name: 'Apple Estate', price: '₦78,000,000', category: 'Residential', image: 'img4.jpeg', location: 'Ibadan' },
  { id: '5', name: 'Iceland Estate', price: '₦105,000,000', category: 'Luxury', image: 'img5.jpeg', location: 'Lagos' },
  { id: '6', name: 'Ngozika Estate', price: '₦45,000,000', category: 'Investment', image: 'img6.jpeg', location: 'Awka' }
];

const categories = ['All', 'Residential', 'Luxury', 'Investment'];

function Arrow() {
  return <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 16 16 4M7 4h9v9" />
  </svg>;
}
function CloseIcon() { return <svg aria-hidden="true" viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="m5 5 10 10M15 5 5 15" /></svg>; }
function MenuIcon() { return <svg aria-hidden="true" viewBox="0 0 20 20" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 5h14M3 10h14M3 15h14" /></svg>; }
function HeartIcon() { return <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M10 17S3 13.1 3 7.7C3 5.7 4.5 4 6.6 4c1.4 0 2.7.8 3.4 1.9C10.7 4.8 12 4 13.4 4 15.5 4 17 5.7 17 7.7 17 13.1 10 17 10 17Z" /></svg>; }
function SearchIcon() { return <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="8.5" cy="8.5" r="4.5" /><path d="m12 12 4 4" /></svg>; }
function DownIcon() { return <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M10 3v13M5 11l5 5 5-5" /></svg>; }
function StarIcon() { return <svg aria-hidden="true" viewBox="0 0 20 20" width="13" height="13" fill="currentColor"><path d="m10 2.3 2.2 4.5 5 .7-3.6 3.5.9 4.9-4.5-2.4-4.5 2.4.9-4.9-3.6-3.5 5-.7L10 2.3Z" /></svg>; }
function formatFileSize(bytes) {
  if (!bytes) return 'Campaign material';
  return `${(bytes / 1024 / 1024).toFixed(bytes > 1024 * 1024 ? 1 : 0)} MB`;
}

export default function JetlandHomeClient() {
  const [properties, setProperties] = useState(fallbackProperties);
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(null);
  const [saved, setSaved] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [authMode, setAuthMode] = useState('register');
  const [authMessage, setAuthMessage] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [flyers, setFlyers] = useState([]);
  const [flyersLoaded, setFlyersLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const memberName = useMemo(() => {
    if (!currentUser?.name) return 'Dashboard';
    const parts = currentUser.name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[1][0]}.`;
  }, [currentUser]);

  useEffect(() => {
    fetch('/api/properties').then(response => response.ok ? response.json() : Promise.reject()).then(data => {
      if (data.properties?.length) setProperties(data.properties);
    }).catch(() => undefined);
    fetch('/api/flyers').then(response => response.ok ? response.json() : Promise.reject()).then(data => {
      setFlyers(data.flyers || []);
    }).catch(() => undefined).finally(() => setFlyersLoaded(true));

    const storedUser = localStorage.getItem('jetland-user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setCurrentUser(parsedUser);
      } catch (error) {
        localStorage.removeItem('jetland-user');
      }
    }

    const token = localStorage.getItem('jetland-token');
    if (token) {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(response => response.ok ? response.json() : Promise.reject())
        .then(data => {
          if (data.user) {
            localStorage.setItem('jetland-user', JSON.stringify(data.user));
            setCurrentUser(data.user);
          } else {
            localStorage.removeItem('jetland-token');
            localStorage.removeItem('jetland-user');
          }
        })
        .catch(() => {
          localStorage.removeItem('jetland-token');
          localStorage.removeItem('jetland-user');
          setCurrentUser(null);
        });
    }
  }, []);

  useEffect(() => {
    const guestKey = 'jetland-saved-guest';
    const userKey = currentUser ? `jetland-saved-${currentUser.id}` : guestKey;
    const guestSaved = JSON.parse(localStorage.getItem(guestKey) || '[]');
    if (currentUser) {
      const userSaved = JSON.parse(localStorage.getItem(userKey) || '[]');
      const merged = [...new Set([...(userSaved.length ? userSaved : guestSaved), ...userSaved])];
      setSaved(merged);
      localStorage.setItem(userKey, JSON.stringify(merged));
      if (!userSaved.length && guestSaved.length) localStorage.setItem(guestKey, JSON.stringify([]));
      return;
    }
    setSaved(JSON.parse(localStorage.getItem(guestKey) || '[]'));
  }, [currentUser]);

  const visibleProperties = useMemo(() => properties.filter(property => {
    const matchesCategory = filter === 'All' || property.category === filter;
    const searchable = `${property.name} ${property.location} ${property.category}`.toLowerCase();
    return matchesCategory && searchable.includes(query.trim().toLowerCase());
  }), [filter, properties, query]);

  function toggleSaved(id) {
    const next = saved.includes(id) ? saved.filter(item => item !== id) : [...saved, id];
    setSaved(next);
    const storageKey = currentUser ? `jetland-saved-${currentUser.id}` : 'jetland-saved-guest';
    localStorage.setItem(storageKey, JSON.stringify(next));
  }

  function openProperty(property) {
    setSelectedProperty(property);
    setModal('details');
  }

  async function submitAuth(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    setAuthMessage('');
    try {
      const response = await fetch(`/api/auth/${authMode === 'login' ? 'login' : 'register'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values)
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message);

      if (authMode === 'register') {
        setAuthMode('login');
        setAuthMessage('Account created. Please sign in now.');
        event.currentTarget.reset();
        return;
      }

      localStorage.setItem('jetland-token', payload.token);
      localStorage.setItem('jetland-user', JSON.stringify(payload.user));
      setCurrentUser(payload.user);
      setAuthMessage(payload.message);
      setModal(null);
      event.currentTarget.reset();
    } catch (error) {
      setAuthMessage(error.message || 'Unable to reach the account service.');
    }
  }

  async function submitContact(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    setContactMessage('');
    try {
      const response = await fetch('/api/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values)
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message);
      setContactMessage(payload.message);
      event.currentTarget.reset();
    } catch (error) {
      setContactMessage(error.message || 'Unable to send your enquiry right now.');
    }
  }

  return <main>
    <nav className="nav --effects"><a className="brand" href="#top">JETLAND<span>•</span></a>
      <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">{menuOpen ? <CloseIcon /> : <MenuIcon />}</button>
      <div className={`nav-links ${menuOpen ? 'is-open' : ''}`}>
        <a href="#collection" onClick={() => setMenuOpen(false)}>Collection</a><a href="#services" onClick={() => setMenuOpen(false)}>Services</a><button className="text-button" onClick={() => { setMenuOpen(false); setModal('flyers'); }}>Campaigns</button><a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
        <button className="text-button" onClick={() => { setAuthMode('login'); setModal('auth'); }}>Sign in</button>
        <button className="nav-cta" onClick={() => { if (currentUser) { setModal('explore'); return; } setAuthMode('register'); setModal('auth'); }}>{currentUser ? memberName : 'Become a member'} <Arrow /></button>
      </div>
    </nav>

    <section className="hero --effects" id="top">
      <div className="hero-copy reveal"><p className="eyebrow">A more considered way to own land</p><h1>Make room for <em>what&apos;s next.</em></h1><p className="hero-body">Exceptional addresses, meaningful value, and a team that makes every step feel certain.</p><div className="hero-actions"><button className="button button-gold" onClick={() => setModal('explore')}>Explore the collection <Arrow /></button><a className="button button-ghost" href="#why-us">Our approach</a></div></div>
      <div className="hero-visual reveal"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><img src="/assets/img/img18.jpeg" alt="Jetland property landscape"/><div className="floating-card"><span>Curated this month</span><strong>06</strong><small>future-facing estates</small></div><div className="scroll-note">SCROLL TO DISCOVER <i><DownIcon /></i></div></div>
    </section>

    <section className="proof-bar --effects"><p>Trusted beyond the transaction</p><div><strong>12+</strong><span>years of local insight</span></div><div><strong>1,800</strong><span>plots thoughtfully placed</span></div><div><strong>98%</strong><span>client confidence score</span></div></section>

    <section className="collection --effects" id="collection"><div className="section-heading"><div><p className="eyebrow">The Jetland collection</p><h2>Land that earns<br/><em>its place in your story.</em></h2></div><button className="round-link" onClick={() => setModal('explore')} aria-label="Open all properties"><Arrow /></button></div>
      <div className="property-grid">{properties.slice(0, 6).map((property, index) => <article className={`property-card card-${index + 1}`} key={property.id}><img src={`/assets/img/${property.image}`} alt={property.name}/><div className="card-shade"/><div className="card-top"><span>{property.featured ? 'Featured listing' : property.category}</span><button aria-label={`Save ${property.name}`} className={saved.includes(property.id) ? 'saved' : ''} onClick={() => toggleSaved(property.id)}><HeartIcon /></button></div><div className="card-bottom"><p>{property.location || 'Nigeria'}</p><h3>{property.name}</h3><div><strong>{property.price}</strong><button onClick={() => openProperty(property)}>View <Arrow /></button></div></div></article>)}</div>
      <button className="button button-dark collection-cta" onClick={() => setModal('explore')}>Browse all properties <Arrow /></button>
    </section>

    <section className="manifesto --effects" id="why-us"><div className="manifesto-image"><img src="/assets/img/img2.jpg" alt="Architecture and landscape"/><p>Quiet confidence. <em>Lasting value.</em></p></div><div className="manifesto-copy"><p className="eyebrow">Designed around your certainty</p><h2>The details change<br/>everything.</h2><p>We pair rigorous due diligence with a deeply personal way of working, so an important decision feels clear from the first conversation.</p><div className="principles"><article><span>01</span><div><h3>Verified, before viewed</h3><p>Every opportunity passes our practical and legal checks.</p></div></article><article><span>02</span><div><h3>Clarity without pressure</h3><p>Human guidance at every turn, never a hard sell.</p></div></article><article><span>03</span><div><h3>Built for the long view</h3><p>Places selected for relevance today and resilience tomorrow.</p></div></article></div></div></section>

    <section className="services --effects" id="services"><div className="service-intro"><p className="eyebrow">More than a purchase</p><h2>A more complete way<br/>to move forward.</h2><p>From the first shortlist to your long-term plans, our specialist team keeps the entire ownership experience feeling effortless.</p><button className="button button-dark" onClick={() => document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' })}>Talk to an advisor <Arrow /></button></div><div className="service-stack"><article><span>01</span><div><p>Private acquisition</p><h3>Find the address that fits your ambition.</h3></div><i><Arrow /></i></article><article><span>02</span><div><p>Due diligence</p><h3>Every essential detail, made unmistakably clear.</h3></div><i><Arrow /></i></article><article><span>03</span><div><p>Future planning</p><h3>Turn a meaningful plot into a lasting legacy.</h3></div><i><Arrow /></i></article></div></section>

    <section className="contact --effects" id="contact"><div className="contact-copy"><p className="eyebrow">Begin with a conversation</p><h2>Your next address<br/>is closer than you think.</h2><p>Tell us what you are looking to build, preserve, or pass on. We will return with thoughtful options—not a sales pitch.</p><div className="contact-details"><a href="mailto:hello@jetland.com">hello@jetland.com</a><span>Abuja · Lagos · Nationwide</span></div></div><form onSubmit={submitContact}><label>Full name<input name="name" required placeholder="Your name"/></label><label>Email address<input name="email" type="email" required placeholder="you@example.com"/></label><label>What are you exploring?<textarea name="message" required placeholder="Tell us a little about your plans" rows="4"/></label><button className="button button-gold" type="submit">Send enquiry <Arrow /></button>{contactMessage && <p className="contact-message">{contactMessage}</p>}</form></section>

    <section className="journal --effects" id="journal"><p className="eyebrow">The field notes</p><h2>Perspective for the<br/><em>future you&apos;re building.</em></h2><div className="journal-cards"><article><span>OWNERSHIP</span><h3>How to recognise a land opportunity with real staying power.</h3><a href="#collection">Read field note <Arrow /></a></article><article><span>INSIGHT</span><h3>Three signals shaping Nigeria&apos;s most thoughtful new neighbourhoods.</h3><a href="#collection">Read field note <Arrow /></a></article></div></section>

    <footer><a className="brand" href="#top">JETLAND<span>•</span></a><p>Land, beautifully considered.</p><button className="footer-flyers" onClick={() => setModal('flyers')}>Campaign flyers <DownIcon /></button><button className="button button-gold" onClick={() => { if (currentUser) { setModal('explore'); return; } setAuthMode('register'); setModal('auth'); }}>{currentUser ? 'Dashboard' : 'Start your journey'} <Arrow /></button><small>© {new Date().getFullYear()} Jetland. Built for what&apos;s next.</small></footer>

    {modal === 'explore' && <div className="overlay" role="dialog" aria-modal="true" aria-label="Explore properties"><div className="explorer"><button className="close" onClick={() => setModal(null)}><CloseIcon /></button><p className="eyebrow">A place for every future</p><h2>Explore the collection.</h2><div className="explore-tools"><label><span><SearchIcon /></span><input value={query} onChange={event => setQuery(event.target.value)} autoFocus placeholder="Search location or estate"/></label><div className="filters">{categories.map(category => <button className={filter === category ? 'active' : ''} onClick={() => setFilter(category)} key={category}>{category}</button>)}</div></div><p className="result-count">{visibleProperties.length} properties selected for you</p><div className="explore-grid">{visibleProperties.map(property => <article key={property.id} onClick={() => openProperty(property)}><img src={`/assets/img/${property.image}`} alt=""/><div><span>{property.featured ? 'Featured listing' : property.category}</span><h3>{property.name}</h3><p>{property.location || 'Nigeria'} · {property.price}</p></div><button aria-label={`Save ${property.name}`} className={saved.includes(property.id) ? 'saved' : ''} onClick={event => { event.stopPropagation(); toggleSaved(property.id); }}><HeartIcon /></button></article>)}{!visibleProperties.length && <p className="no-results">No estates match that search yet.</p>}</div></div></div>}

    {modal === 'details' && selectedProperty && <div className="overlay" role="dialog" aria-modal="true" aria-label={`${selectedProperty.name} details`}><article className="property-details"><button className="close" onClick={() => setModal(null)}><CloseIcon /></button><div className="property-details__image"><img src={`/assets/img/${selectedProperty.image}`} alt={selectedProperty.name}/>{selectedProperty.featured && <span className="featured-badge"><StarIcon /> Featured listing</span>}<button className={saved.includes(selectedProperty.id) ? 'save-control saved' : 'save-control'} onClick={() => toggleSaved(selectedProperty.id)}>{saved.includes(selectedProperty.id) ? 'Saved' : 'Save property'} <HeartIcon /></button></div><div className="property-details__content"><p className="eyebrow">{selectedProperty.category} · {selectedProperty.location || 'Nigeria'}</p><h2>{selectedProperty.name}</h2><p className="property-price">{selectedProperty.price}</p><p className="property-description">{selectedProperty.description || `${selectedProperty.name} is a carefully selected opportunity for buyers seeking a secure, future-facing address with room to grow.`}</p><div className="detail-facts"><div><span>Listing type</span><strong>{selectedProperty.category}</strong></div><div><span>Location</span><strong>{selectedProperty.location || 'Nigeria'}</strong></div><div><span>Availability</span><strong>{selectedProperty.soldOut ? 'Reserved' : 'Available now'}</strong></div></div><div className="detail-actions"><button className="button button-gold" onClick={() => { setModal(null); document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' }); }}>Request a private viewing <Arrow /></button><button className="detail-back" onClick={() => setModal('explore')}>Back to collection</button></div></div></article></div>}

    {modal === 'flyers' && <div className="overlay" role="dialog" aria-modal="true" aria-label="Campaign flyer downloads"><section className="flyer-library"><button className="close" onClick={() => setModal(null)}><CloseIcon /></button><p className="eyebrow">Jetland campaign library</p><h2>Take the details<br/>with you.</h2><p className="flyer-library__intro">Download the latest estate brochures, launch packs, and campaign material prepared by our team.</p><div className="flyer-list">{flyers.map(flyer => <article key={flyer.id}><div className="flyer-icon">PDF</div><div><span>Campaign flyer · {formatFileSize(flyer.size)}</span><h3>{flyer.title}</h3><p>{flyer.description || flyer.originalName || 'Jetland campaign material'}</p></div><a href={flyer.downloadUrl} download={flyer.originalName || true}>Download <Arrow /></a></article>)}{flyersLoaded && !flyers.length && <div className="flyer-empty"><strong>New campaign material is on its way.</strong><p>Our latest flyers will appear here as soon as they are published by the Jetland team.</p></div>}{!flyersLoaded && <div className="flyer-empty">Loading campaign library…</div>}</div></section></div>}

    {modal === 'auth' && <div className="overlay" role="dialog" aria-modal="true" aria-label="Account"><div className="auth"><button className="close" onClick={() => setModal(null)}><CloseIcon /></button><p className="eyebrow">Your Jetland account</p><h2>{authMode === 'login' ? 'Welcome back.' : 'Your next chapter starts here.'}</h2><div className="auth-tabs"><button className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')}>Create account</button><button className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>Sign in</button></div><form onSubmit={submitAuth}>{authMode === 'register' && <label>Full name<input name="name" required placeholder="Your name"/></label>}<label>Email address<input name="email" type="email" required placeholder="you@example.com"/></label><label>Password<input name="password" type="password" minLength="8" required placeholder="At least 8 characters"/></label>{authMode === 'register' && <label className="terms"><input name="terms" type="checkbox" required/> I agree to the terms and privacy policy.</label>}<button className="button button-dark" type="submit">{authMode === 'login' ? 'Sign in' : 'Create account'} <Arrow /></button>{authMessage && <p className="auth-message">{authMessage}</p>}</form></div></div>}
  </main>;
}
