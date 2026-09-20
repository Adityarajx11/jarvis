// News module — DuckDuckGo instant news + Google News RSS (no API keys)

async function getNews(topic) {
  const results = [];

  // Google News RSS (no API key needed)
  try {
    const q = topic || 'world';
    const res = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-IN&gl=IN&ceid=IN:en`, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const xml = await res.text();
      const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
      for (const item of items.slice(0, 8)) {
        const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || item.match(/<title>(.*?)<\/title>/)?.[1] || '';
        const link = item.match(/<link>(.*?)<\/link>/)?.[1] || '';
        const source = item.match(/<source.*?>(.*?)<\/source>/)?.[1] || 'Google News';
        if (title) results.push({ title: title.replace(/&amp;/g, '&').replace(/&#39;/g, "'"), source, url: link, snippet: '' });
      }
    }
  } catch {}

  return results;
}

function formatNews(items, topic) {
  if (!items.length) return `No news found${topic ? ` for "${topic}"` : ''}.`;
  let s = `Here's what's happening${topic ? ` with ${topic}` : ''}:\n\n`;
  items.forEach((n, i) => {
    const num = ['One', 'Two', 'Three', 'Four', 'Five', 'Six'][i] || `${i + 1}`;
    s += `${num}. ${n.title}\n   Source: ${n.source}\n\n`;
  });
  return s.trim();
}

module.exports = { getNews, formatNews };
