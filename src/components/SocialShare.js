// Lightweight share buttons -- no external SDKs, just URL handoffs. Render
// on product pages alongside the buy button.

import {
  FaFacebook,
  FaXTwitter,
  FaPinterest,
  FaWhatsapp,
  FaLinkedin,
  FaEnvelope,
} from 'react-icons/fa6';
import { useState } from 'react';
import { FiLink } from 'react-icons/fi';

export default function SocialShare({ url, title, image }) {
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent;

  const links = [
    {
      name: 'Facebook',
      icon: FaFacebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
    },
    {
      name: 'X',
      icon: FaXTwitter,
      href: `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(title)}`,
    },
    {
      name: 'Pinterest',
      icon: FaPinterest,
      href: `https://pinterest.com/pin/create/button/?url=${enc(url)}&media=${enc(image || '')}&description=${enc(title)}`,
    },
    {
      name: 'WhatsApp',
      icon: FaWhatsapp,
      href: `https://api.whatsapp.com/send?text=${enc(title + ' ' + url)}`,
    },
    {
      name: 'LinkedIn',
      icon: FaLinkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`,
    },
    {
      name: 'Email',
      icon: FaEnvelope,
      href: `mailto:?subject=${enc(title)}&body=${enc(url)}`,
    },
  ];

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (_) {}
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-slate-600">Share:</span>
      {links.map(({ name, icon: Icon, href }) => (
        <a
          key={name}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Share on ${name}`}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-brand-100 hover:text-brand-600"
        >
          <Icon />
        </a>
      ))}
      <button
        onClick={copyLink}
        aria-label="Copy link"
        className="inline-flex h-9 items-center gap-1 rounded-full bg-slate-100 px-3 text-sm text-slate-700 hover:bg-brand-100 hover:text-brand-600"
      >
        <FiLink /> {copied ? 'Copied!' : 'Copy link'}
      </button>
    </div>
  );
}
