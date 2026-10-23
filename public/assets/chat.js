(() => {
  const $ = (s) => document.querySelector(s);
  const box = $('#msgs');
  if (!box) return;
  const form = $('#composer'), input = $('#msg'), sendBtn = $('#send'), chips = $('#chips');
  const dot = $('#dot'), dotText = $('#dotText');
  const KEY = 'agah_chat_v1', PKEY = 'agah_profile_v1';

  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  let history = load(KEY, []);
  let profile = load(PKEY, {});
  let busy = false, last = 0, controller = null;

  const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inline = (s) => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  function md(t) {
    const lines = esc(t).split('\n');
    let out = '', list = null;
    const close = () => { if (list) { out += `</${list}>`; list = null; } };
    for (const raw of lines) {
      const l = raw.trim();
      let m;
      if ((m = l.match(/^[-•*]\s+(.*)/))) { if (list !== 'ul') { close(); out += '<ul>'; list = 'ul'; } out += `<li>${inline(m[1])}</li>`; }
      else if ((m = l.match(/^[\d۰-۹]+[.)]\s+(.*)/))) { if (list !== 'ol') { close(); out += '<ol>'; list = 'ol'; } out += `<li>${inline(m[1])}</li>`; }
      else if (l === '') close();
      else { close(); out += `<p>${inline(l)}</p>`; }
    }
    close();
    return out;
  }

  function add(role, text) {
    const el = document.createElement('div');
    el.className = 'm ' + (role === 'user' ? 'u' : 'a');
    if (role === 'user') el.textContent = text; else el.innerHTML = md(text);
    box.appendChild(el);
    scroll();
    return el;
  }
  const scroll = () => { box.scrollTop = box.scrollHeight; };

  function greet() {
    add('assistant', 'سلام! 👋 من دستیار آگاهم.\nمی‌تونم کمکت کنم وقت‌تلف‌کردن توی اپ‌ها رو کم کنی، خرج‌هات رو آگاهانه‌تر ببینی و عادت‌های بهتری بسازی.\nاز چی شروع کنیم؟');
  }
  function render() {
    box.innerHTML = '';
    if (!history.length) greet();
    history.forEach((m) => add(m.role, m.content));
  }

  function setBusy(v) { busy = v; sendBtn.disabled = v; }
  function autosize() { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 140) + 'px'; }

  function errText(code) {
    if (code === 'ai_not_configured') return 'سرویس هوش مصنوعی هنوز روی سرور فعال نشده. (راهنمای README رو ببین)';
    if (code === 'rate_limited' || code === '429') return 'یه کم سریع بودی 😅 چند لحظه صبر کن و دوباره امتحان کن.';
    if (code === 'too_large' || code === '413') return 'پیامت زیادی بلنده؛ کوتاه‌ترش کن.';
    return 'ارتباط با دستیار برقرار نشد. اینترنتت رو بررسی کن و دوباره امتحان کن.';
  }

  async function send(text) {
    text = (text || '').trim();
    if (!text || busy) return;
    if (Date.now() - last < 1200) return;
    last = Date.now();
    input.value = ''; autosize();
    chips.hidden = true;
    history.push({ role: 'user', content: text });
    add('user', text);
    const bot = add('assistant', '');
    bot.innerHTML = '<span class="dots"><i></i><i></i><i></i></span>';
    setBusy(true);
    controller = new AbortController();
    let acc = '';
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: history.slice(-12), profile }),
        signal: controller.signal,
      });
      if (!res.ok) {
        let e = String(res.status);
        try { e = (await res.json()).error || e; } catch {}
        throw new Error(e);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, i).trim();
          buf = buf.slice(i + 1);
          if (!line.startsWith('data:')) continue;
          const d = line.slice(5).trim();
          if (!d || d === '[DONE]') continue;
          try {
            const j = JSON.parse(d);
            const piece = j.response ?? j.choices?.[0]?.delta?.content ?? '';
            if (piece) { acc += piece; bot.innerHTML = md(acc); scroll(); }
          } catch {}
        }
      }
      if (!acc.trim()) throw new Error('empty');
      history.push({ role: 'assistant', content: acc });
    } catch (err) {
      if (err.name === 'AbortError') {
        if (acc) history.push({ role: 'assistant', content: acc }); else bot.remove();
      } else {
        bot.classList.add('err');
        bot.textContent = errText(err.message);
        history.pop();
      }
    } finally {
      setBusy(false);
      save(KEY, history.slice(-40));
    }
  }

  form.addEventListener('submit', (e) => { e.preventDefault(); send(input.value); });
  input.addEventListener('input', autosize);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(input.value); }
  });
  chips.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => send(b.textContent)));
  $('#clear').addEventListener('click', () => {
    if (controller) controller.abort();
    history = []; save(KEY, []); chips.hidden = false; render();
  });

  // profile
  const map = { 'p-goal': 'goal', 'p-app': 'app', 'p-budget': 'budget', 'p-goalname': 'goalName', 'p-focus': 'focus' };
  Object.entries(map).forEach(([id, k]) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (profile[k] != null) el.value = profile[k];
    el.addEventListener('input', () => { profile[k] = el.value; save(PKEY, profile); });
  });
  profile.target = profile.target || '';

  // daily check-in
  let mood = '';
  document.querySelectorAll('#moods button').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('#moods button').forEach((x) => x.classList.remove('on'));
    mood = mood === b.dataset.m ? '' : b.dataset.m;
    if (mood) b.classList.add('on');
  }));
  $('#checkin').addEventListener('submit', (e) => {
    e.preventDefault();
    const s = $('#c-screen').value, sp = $('#c-spend').value;
    const parts = [];
    if (s) parts.push(`امروز ${s} دقیقه روی اپ‌های وقت‌گیر بودم`);
    if (sp) parts.push(`${sp} تومان خرج کردم`);
    if (mood) parts.push(`حالم ${mood} بود`);
    if (!parts.length) return;
    send('چک‌این امروزم: ' + parts.join('، ') + '. نظرت چیه و برای فردا چه کار کوچیکی پیشنهاد می‌دی؟');
    $('#assistant').scrollIntoView({ behavior: 'smooth' });
  });

  // status
  fetch('/api/health').then((r) => r.json()).then((j) => {
    if (j.ok && j.ai) { dot.className = 'dot on'; dotText.textContent = 'آنلاین'; }
    else { dot.className = 'dot off'; dotText.textContent = 'هوش مصنوعی فعال نیست'; }
  }).catch(() => { dot.className = 'dot off'; dotText.textContent = 'آفلاین'; });

  render();
  if (new URLSearchParams(location.search).get('from') === 'app') setTimeout(() => input.focus({ preventScroll: true }), 1200);
})();
