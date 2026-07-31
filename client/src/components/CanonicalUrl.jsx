import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// index.html can only ever carry one canonical, and being a single-page app,
// every route inherited it — so /login, /privacy, /terms and /accessibility all
// declared themselves copies of the homepage. Those four are in sitemap.xml and
// allowed in robots.txt, meaning we submitted them for indexing and then told
// the crawler to ignore them. This keeps the tag pointed at the current route.
//
// The host is pinned rather than read from window.location: www is canonical
// (the apex 308-redirects to it), and a preview deployment should never
// advertise its own hostname as the canonical one.
const SITE = 'https://www.dojolink.app';

export default function CanonicalUrl() {
  const { pathname } = useLocation();

  useEffect(() => {
    const path = pathname !== '/' && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
    let tag = document.querySelector('link[rel="canonical"]');
    if (!tag) {
      tag = document.createElement('link');
      tag.rel = 'canonical';
      document.head.appendChild(tag);
    }
    tag.href = `${SITE}${path}`;
  }, [pathname]);

  return null;
}
