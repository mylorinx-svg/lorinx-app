# Builds the shared product-marketing document (Hebrew, RTL) from content/<product>.py modules.
# Usage: python3 build_pm.py <out.html>
import html, importlib.util, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1]
ORDER = ['cup', 'gun', 'foot', 'thigh']
STATUSES = [
    {'k': 'wait', 'label': 'ממתין לאישור'},
    {'k': 'ok', 'label': 'אושר'},
    {'k': 'fix', 'label': 'דורש תיקונים'},
    {'k': 'no', 'label': 'נדחה'},
]
LEVEL = {'v': ('אומת בעמוד', 'lv-v'), 's': ('קטע חיפוש', 'lv-s'), 'n': ('לא אומת', 'lv-n'), 'i': ('פרשנות', 'lv-i'), 'p': ('מהעמוד שלנו', 'lv-p')}
PRI = {'h': 'גבוהה', 'm': 'בינונית', 'l': 'נמוכה'}


def load(key):
    spec = importlib.util.spec_from_file_location(key, os.path.join(HERE, 'content', key + '.py'))
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m.P


def t(s):
    s = html.escape(str(s), quote=False)
    s = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
    return s.replace('\n', '<br>')


def lv(k):
    label, cls = LEVEL[k]
    return f'<span class="lv {cls}">{label}</span>'


def src(name, url):
    if not url:
        return t(name)
    return f'<a href="{html.escape(url)}" rel="noopener" target="_blank">{t(name)}</a>'


products = [load(k) for k in ORDER]
COPY, SECTIONS = {}, {}
o = []
A = o.append
A('<title>מסמך שיווק מוצרים</title>\n<meta name="claude:viewport-fit-sides" content="cover">')
A('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700&family=IBM+Plex+Mono:wght@400;500&display=swap">')
A(open(os.path.join(HERE, 'style.html')).read())
A('<div class="wrap" dir="rtl" lang="he">')

A(f'''<header class="top">
<p class="eyebrow">LORINX · מסמך עבודה משותף</p>
<h1>מסמך שיווק מוצרים</h1>
<p class="lede">פרק לכל מוצר בחנות: מה הוא, מה מצאנו עליו, למי הוא מתאים, מה עלול לעצור קנייה, הקופי המוצע, ומה לשפר בעמוד. בכל פרק יש מקום להערות שלך ולסטטוס אישור. שום דבר מכאן לא עולה לאתר לפני שתאשר.</p>
<p class="meta">עודכן: 25.11.2026 · {len(products)} מוצרים · נסרק מהטיוטה LORINX Premium ומ-Shopify</p>
</header>''')

A('<section class="how"><h2>איך עובדים עם המסמך</h2><ol class="steps">'
  '<li>בראש כל פרק בוחרים <b>סטטוס</b>: ממתין לאישור, אושר, דורש תיקונים או נדחה.</li>'
  '<li>בכל סעיף יש כפתור <b>הערה</b>. בכל טקסט של הקופי יש גם <b>מאשר</b>, <b>לא מתאים</b> ו<b>ערוך</b>.</li>'
  '<li>בסוף כל פרק יש תיבת <b>הערות, תיקונים והחלטות</b> למוצר כולו.</li>'
  '<li>הכול נשמר אוטומטית. כשסיימת, כתוב לי בצ\'אט, ואעבור על הכול. בעדכונים הבאים ההערות וההחלטות שלך נשמרות.</li></ol>'
  '<p class="note">רמות ראיה ליד כל ממצא: ' + lv('v') + ' נפתח ונקרא, ' + lv('s') + ' רק תקציר מנוע חיפוש, ' + lv('n') + ' לא נבדק, ' + lv('i') + ' מסקנה שלנו, ' + lv('p') + ' כתוב היום בעמוד שלנו.</p>'
  '<p id="pm-warn" class="warnbox" hidden></p></section>')

A('<section class="how" id="pm-general-wrap"><h2>הערות כלליות</h2><textarea id="pm-general" rows="3" placeholder="הערות שנוגעות לכל המוצרים או למסמך כולו" aria-label="הערות כלליות"></textarea></section>')

# overview table
A('<section class="how"><h2>המוצרים</h2><div class="tbl"><table class="ov"><thead><tr><th>מוצר</th><th>שם בעמוד היום</th><th>שם מוצע</th><th>מחיר</th><th>הממצא החשוב</th><th>סטטוס</th></tr></thead><tbody>')
for P in products:
    A(f'<tr><td><a href="#p-{P["key"]}">{t(P["short"])}</a></td><td>{t(P["name_now"])}</td><td>{t(P["name_new"])}</td><td class="num">{t(P["price"])}</td><td>{t(P["headline_finding"])}</td><td><span class="tstat st-wait" data-pm-toc="{P["key"]}">ממתין לאישור</span></td></tr>')
A('</tbody></table></div></section>')

# cross-product notes
cross = json.load(open(os.path.join(HERE, 'content', 'cross.json')))
A('<section class="how"><h2>מה חל על כל המוצרים</h2><ul class="plain">' + ''.join(f'<li>{t(x)}</li>' for x in cross['rules']) + '</ul>'
  '<h3 class="sub">מגבלות המחקר</h3><ul class="plain">' + ''.join(f'<li>{t(x)}</li>' for x in cross['limits']) + '</ul></section>')

for P in products:
    k = P['key']
    A(f'<article class="prod" id="p-{k}" data-pm-product="{k}">')
    A(f'<header class="prod__head"><p class="eyebrow">פרק {ORDER.index(k)+1} מתוך {len(ORDER)}</p><h2>{t(P["short"])}</h2>'
      f'<div class="status-row"><span class="lbl">סטטוס אישור</span><div class="chips" data-pm-status></div></div></header>')

    def sec(n, title):
        sid = f'{k}-{n}'
        SECTIONS[sid] = f'{n}. {title}'
        A(f'<section class="psec" id="{sid}"><div class="psec__h" data-pm-sec="{sid}"><span class="n">{n}</span><h3>{t(title)}</h3></div>')

    # 1
    sec(1, 'שם המוצר וקישור')
    A('<dl class="kv">'
      f'<div><dt>שם בעמוד היום</dt><dd>{t(P["name_now"])}</dd></div>'
      f'<div><dt>שם מוצע</dt><dd><b>{t(P["name_new"])}</b> <span class="why-inline">{t(P["name_why"])}</span></dd></div>'
      f'<div><dt>עמוד בטיוטה</dt><dd><a href="{html.escape(P["draft_url"])}" target="_blank" rel="noopener">פתח את עמוד המוצר</a></dd></div>'
      f'<div><dt>מחיר ב-Shopify</dt><dd class="num">{t(P["price_full"])}</dd></div>'
      f'<div><dt>קטגוריה</dt><dd>{t(P["category"])}</dd></div></dl></section>')
    # 2
    sec(2, 'תיאור המוצר והפיצ\'רים')
    A(f'<p class="para">{t(P["what"])}</p>')
    A('<div class="tbl"><table><thead><tr><th>פיצ\'ר</th><th>מה כתוב / מה ידוע</th><th>מקור</th></tr></thead><tbody>')
    for f in P['features']:
        A(f'<tr><th scope="row">{t(f[0])}</th><td>{t(f[1])}</td><td>{lv(f[2])}</td></tr>')
    A('</tbody></table></div>')
    if P.get('mismatch'):
        A('<div class="flag"><b>אי־התאמות שמצאנו בעמוד</b><ul>' + ''.join(f'<li>{t(x)}</li>' for x in P['mismatch']) + '</ul></div>')
    A('</section>')
    # 3
    sec(3, 'ממצאי המחקר ומקורות')
    A('<ul class="findings">')
    for f in P['findings']:
        A(f'<li><div class="f-t">{t(f["t"])}</div><div class="f-s">{lv(f["lv"])} {src(f.get("src",""), f.get("url",""))}</div></li>')
    A('</ul>')
    A('<details class="verify"><summary>עובדות שצריך לאמת מול הספק לפני שמפרסמים (' + str(len(P['verify'])) + ')</summary><ol>' + ''.join(f'<li>{t(x)}</li>' for x in P['verify']) + '</ol></details></section>')
    # 4
    sec(4, 'קהל היעד והבעיות שהמוצר פותר')
    A('<div class="two"><div><h4>למי</h4><ul class="plain">' + ''.join(f'<li>{t(a[0])} {lv(a[1])}</li>' for a in P['audience']) + '</ul></div>'
      '<div><h4>איזו בעיה</h4><ul class="plain">' + ''.join(f'<li>{t(x)}</li>' for x in P['problems']) + '</ul></div></div>')
    if P.get('audience_note'):
        A(f'<p class="note">{t(P["audience_note"])}</p>')
    A('</section>')
    # 5
    sec(5, 'התועלות והיתרונות השיווקיים')
    A('<div class="tbl"><table><thead><tr><th>תועלת</th><th>למה זה חשוב ללקוח</th><th>על מה זה נשען</th></tr></thead><tbody>')
    for b in P['benefits']:
        A(f'<tr><th scope="row">{t(b[0])}</th><td>{t(b[1])}</td><td>{lv(b[2])}</td></tr>')
    A('</tbody></table></div>')
    A('<div class="dont"><b>לא לכתוב על המוצר הזה</b><ul>' + ''.join(f'<li>{t(x)}</li>' for x in P['dont']) + '</ul></div></section>')
    # 6
    sec(6, 'התנגדויות ודרכים להתמודד')
    A('<div class="tbl"><table><thead><tr><th>מה הלקוח חושב</th><th>איך עונים, בלי להבטיח מה שאין</th></tr></thead><tbody>')
    for ob in P['objections']:
        A(f'<tr><th scope="row">{t(ob[0])}</th><td>{t(ob[1])}</td></tr>')
    A('</tbody></table></div></section>')
    # 7
    sec(7, 'הקופי השיווקי המוצע')
    A(f'<p class="note">{t(P["copy_intro"])}</p><div class="copy">')
    for i, (label, text) in enumerate(P['copy']):
        cid = f'{k}-c{i+1}'
        COPY[cid] = {'product': k, 'label': label, 'text': text}
        A(f'<div class="pm-copy" data-pm-copy="{cid}"><div class="pm-copy__lbl">{t(label)}</div><div class="pm-copy__text">{t(text)}</div></div>')
    A('</div></section>')
    # 8
    sec(8, 'הצעות לשיפור עמוד המוצר')
    A('<div class="tbl"><table><thead><tr><th>מה לעשות</th><th>למה</th><th>עדיפות</th></tr></thead><tbody>')
    for im in P['improve']:
        A(f'<tr><th scope="row">{t(im[0])}</th><td>{t(im[1])}</td><td class="pri pri-{im[2]}">{PRI[im[2]]}</td></tr>')
    A('</tbody></table></div></section>')
    # 9
    A(f'<section class="psec" id="{k}-9"><div class="psec__h"><span class="n">9</span><h3>הערות, תיקונים והחלטות שלך</h3></div><div class="notes" data-pm-notes></div></section>')
    # 10
    A(f'<section class="psec" id="{k}-10"><div class="psec__h"><span class="n">10</span><h3>סטטוס אישור</h3></div><p class="note">הסטטוס נבחר בראש הפרק, ומוצג גם בטבלת המוצרים למעלה.</p></section>')
    A('</article>')

A('<div id="pm-bar" class="bar" role="region" aria-label="סטטוס העריכה"><span id="pm-count"></span><span id="pm-save"></span></div>')
payload = json.dumps({'statuses': STATUSES, 'products': {P['key']: P['short'] for P in products}, 'copy': COPY, 'sections': SECTIONS}, ensure_ascii=False).replace('<', '\\u003c')
A('<script type="application/json" id="pm-data">' + payload + '</script>')
A('<script>' + open(os.path.join(HERE, 'pm.js')).read() + '</script>')
A('</div>')
open(OUT, 'w').write('\n'.join(o))
print('products', len(products), 'copy blocks', len(COPY), 'sections', len(SECTIONS))
