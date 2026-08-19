"use client";

import React from 'react';

export default function WhatsAppBubble() {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '+2347037791793';
  const text = encodeURIComponent("Hi, I'm interested in Jetland properties.");
  const href = `https://wa.me/${number}?text=${text}`;

  const style = {
    position: 'fixed',
    right: '20px',
    bottom: '20px',
    width: '64px',
    height: '64px',
    borderRadius: '999px',
    border: '0',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#25D366',
    color: '#fff',
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
    zIndex: 9999,
    cursor: 'pointer',
  };

  return (
    <button
      type="button"
      aria-label="Chat on WhatsApp"
      title="Chat on WhatsApp"
      onClick={() => window.open(href, '_blank')}
      style={style}
    >
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width="28" height="28" fill="none">
        <path fill="currentColor" d="M20.52 3.48A11.91 11.91 0 0012 0C5.373 0 .028 5.345.028 12c0 2.117.555 4.183 1.604 6.014L0 24l6.252-1.611A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12 0-3.197-1.238-6.195-3.48-8.52zM12 21.5a9.5 9.5 0 01-5.161-1.49l-.37-.228-3.71.958.992-3.621-.241-.373A9.5 9.5 0 1112 21.5z"/>
        <path fill="#fff" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.472-.148-.672.15-.198.297-.767.967-.94 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.885-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.173.198-.298.298-.497.099-.198.05-.372-.025-.52-.074-.149-.672-1.62-.92-2.22-.242-.58-.487-.502-.672-.512l-.572-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.064 2.88 1.213 3.078.149.198 2.095 3.2 5.076 4.487 2.98 1.288 2.98.859 3.513.806.533-.05 1.732-.707 1.98-1.39.248-.684.248-1.27.173-1.39-.074-.119-.272-.198-.57-.347z"/>
      </svg>
    </button>
  );
}
