#!/usr/bin/env python3
"""Generates the JSON templates and section groups of the LORINX Premium (lx2) theme.

The Hebrew copy lives here in one readable place and is written to theme/templates/*.json and
theme/sections/*-group.json. After generation the merchant can edit everything in the theme editor.

Run:  python3 tools/build_templates.py
"""
import json
import os
from collections import OrderedDict

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'theme')

CUP = 'כוס-רוח-חשמלית'
GUN = 'אקדח-מסאג'
FOOT = 'מסאגר-חשמלי-לרגליים'
THIGH = 'מכשיר-לחיזוק-ועיצוב-הירכיים'
COLLECTION = 'המוצר-שלנו'
CUP_URL = 'shopify://products/' + CUP
ABOUT_URL = 'shopify://pages/קצת-עלינו'
B2B_URL = 'shopify://pages/כמויות-לחברות'
CONTACT_URL = 'shopify://pages/contact'
ALL_URL = 'shopify://pages/המוצרים-שלנו'
SHIP_URL = 'shopify://policies/shipping-policy'
REFUND_URL = 'shopify://policies/refund-policy'


def img(name):
    return 'shopify://shop_images/' + name


def p(*paras):
    return ''.join('<p>%s</p>' % x for x in paras)


class Template:
    def __init__(self):
        self.sections = OrderedDict()

    def add(self, key, type_, settings=None, blocks=None):
        sec = OrderedDict(type=type_)
        if blocks:
            b = OrderedDict()
            for i, (btype, bsettings) in enumerate(blocks):
                b['%s_%d' % (btype, i + 1)] = OrderedDict(type=btype, settings=bsettings)
            sec['blocks'] = b
            sec['block_order'] = list(b.keys())
        sec['settings'] = settings or {}
        self.sections[key] = sec
        return self

    def dump(self, path, extra=None):
        data = OrderedDict()
        if extra:
            data.update(extra)
        data['sections'] = self.sections
        data['order'] = list(self.sections.keys())
        full = os.path.join(ROOT, path)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        with open(full, 'w', encoding='utf8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write('\n')
        n = len(self.sections)
        assert n <= 25, '%s has %d sections (Shopify limit is 25)' % (path, n)
        print('%-34s %2d sections' % (path, n))


def items(rows):
    return [('item', dict(zip(('title', 'text'), r))) for r in rows]


def timeline(rows):
    return [('item', dict(zip(('label', 'text'), r))) for r in rows]


def facts(rows):
    return [('fact', dict(zip(('icon', 'title', 'text'), r))) for r in rows]


def checks(rows):
    return [('check', {'text': r}) for r in rows]


def qa(rows):
    return [('qa', {'q': q, 'a': a}) for q, a in rows]


ASSURE = facts([
    ('truck', 'משלוח חינם', 'לכל הארץ, 7–14 ימי עסקים.'),
    ('return', '14 יום להחזרה', 'מרגע קבלת המוצר, בלי דמי ביטול.'),
    ('shield', 'אחריות לשנה', 'על המכשיר, ישירות מ־LORINX.'),
    ('chat', 'שירות בעברית', 'לפני ואחרי הרכישה.'),
])

WELLNESS_NOTE = 'התחושה משתנה מאדם לאדם. המוצר מיועד לרווחה כללית ואינו תחליף לייעוץ או לטיפול רפואי.'

# --------------------------------------------------------------------------- groups
header = Template().add('lx2_header', 'lx2-header', {'menu': 'main-menu'}, [
    ('announcement', {'text': 'משלוח חינם לכל הארץ'}),
    ('announcement', {'text': '14 יום להחזרה'}),
    ('announcement', {'text': 'אחריות לשנה'}),
])
header.dump('sections/header-group.json', OrderedDict(type='header', name='Header group'))

footer = Template().add('lx2_footer', 'lx2-footer', {}, [
    ('menu', {'heading': 'ניווט', 'menu': 'main-menu'}),
    ('links', {'heading': 'שירות', 'label_1': 'צרו קשר', 'url_1': CONTACT_URL,
               'label_2': 'כמויות לחברות', 'url_2': B2B_URL,
               'label_3': 'הסיפור שלנו', 'url_3': ABOUT_URL}),
    ('policies', {'heading': 'מדיניות'}),
])
footer.dump('sections/footer-group.json', OrderedDict(type='footer', name='Footer group'))

# --------------------------------------------------------------------------- home
home = Template()
home.add('hero', 'lx2-hero', {
    'bg_asset': 'lx2-hero-runners.jpg', 'bg_video': 'https://cdn.shopify.com/videos/c/vp/ed2070c336b1404286be9215aabbc97c/ed2070c336b1404286be9215aabbc97c.HD-720p-2.1Mbps-102026374.mp4', 'aura': 0,
    'eyebrow': 'LORINX · התאוששות, כושר, ספורט',
    'heading': 'כל אימון\nנגמר ברגע\nשל שחרור.',
    'text': 'מכשירי התאוששות לבית: לפני האימון, אחריו, ובסוף יום ארוך.',
    'cta_label': 'לכל המוצרים', 'cta_url': ALL_URL,
    'link_label': 'איך אנחנו עובדים', 'link_url': '#how',
}, [('stat', {'value': 'משלוח חינם', 'label': 'לכל הארץ, 7–14 ימי עסקים'}),
    ('stat', {'value': '14 יום', 'label': 'להחזרה, בלי דמי ביטול'}),
    ('stat', {'value': 'אחריות לשנה', 'label': 'תיקון או החלפה'}),
    ('stat', {'value': 'עונים בווטסאפ', 'label': 'א׳–ה׳ 09:00–18:00'})])
home.add('words', 'lx2-marquee', {'speed': 44}, [('word', {'text': t}) for t in ('שחרור', 'חום', 'רוגע', 'שגרה', 'בבית')])
home.add('how', 'lx2-list', {
    'anchor': 'how', 'tone': 'dark', 'layout': 'steps', 'numbered': True,
    'eyebrow': 'איך אנחנו עובדים', 'heading': 'שלושה דברים שנכונים לכל מכשיר.',
    'text': 'ככה אנחנו עובדים עם כל אחד מהמכשירים.',
}, items([
    ('מסבירים לפני שמוכרים', 'בעמוד של כל מכשיר: מה מרגישים, למי הוא לא מתאים, ומה כלול.'),
    ('מחזירים בלי מאבק', '14 יום מיום הקבלה, בלי דמי ביטול, ומשלוח ההחזרה עלינו.'),
    ('עונים בעצמנו', 'בווטסאפ, א׳–ה׳ 09:00–18:00. אדם אחד, שקורא כל הודעה.'),
]))
home.add('recovery', 'lx2-category', {
    'product_type': 'התאוששות', 'anchor': 'categories', 'tone': 'surface', 'eyebrow': 'קטגוריה', 'heading': 'התאוששות',
})
home.add('training', 'lx2-category', {
    'product_type': 'אימון', 'tone': 'bg', 'eyebrow': 'קטגוריה', 'heading': 'אימון',
})
home.add('moments', 'lx2-list', {
    'tone': 'surface', 'layout': 'timeline', 'numbered': False,
    'eyebrow': 'מתי משתמשים', 'heading': 'לפני, אחרי ובסוף היום.',
    'text': 'בלי לקבוע תור ובלי לצאת מהבית.',
}, timeline([
    ('לפני האימון', 'מתחילים מוכנים.'),
    ('אחרי האימון', 'רגע לשחרר ולהאט.'),
    ('בסוף יום ארוך', 'בבית, בלי להתארגן.'),
    ('בבוקר', 'הרגל קטן שנכנס לשגרה.'),
]))
home.add('messages', 'lx2-reviews', {
    'tone': 'bg', 'eyebrow': 'מהלקוחות שלנו', 'heading': 'הודעות שקיבלנו בווטסאפ.',
    'shots_heading': '',
}, [('screenshot', {'image': img(n)}) for n in (
    'WhatsApp_Image_2026-09-05_at_14.35.47_5.jpg', 'WhatsApp_Image_2026-09-05_at_14.35.47_1.jpg',
    'WhatsApp_Image_2026-09-05_at_14.35.47_4.jpg', 'WhatsApp_Image_2026-09-05_at_14.35.47_3.jpg',
    'WhatsApp_Image_2026-09-05_at_14.35.47_2.jpg', 'WhatsApp_Image_2026-09-05_at_14.35.47.jpg')])
home.add('story', 'lx2-cta', {
    'tone': 'bg', 'aura': True, 'eyebrow': 'הסיפור שלנו',
    'heading': 'לפעמים מותג לא מתחיל במוצר. הוא מתחיל בתחושה.',
    'text': 'LORINX בוחרת כל מוצר אחד־אחד: שימושי באמת, איכותי מספיק כדי לעמוד מאחוריו, ונתמך בישראל.',
    'cta_label': 'לסיפור המלא', 'cta_url': ABOUT_URL,
    'link_label': 'כמויות לחברות', 'link_url': B2B_URL,
})
home.add('assure', 'lx2-facts', {'tone': 'surface', 'label': 'התחייבויות השירות שלנו'}, ASSURE)
home.add('faq', 'lx2-faq', {
    'tone': 'bg', 'eyebrow': 'שאלות נפוצות', 'heading': 'לפני שמזמינים.',
    'text': 'לא מצאתם תשובה? נשמח לעזור.', 'link_label': 'דברו איתנו', 'link_url': CONTACT_URL,
}, qa([
    ('כמה זמן לוקח המשלוח?', p('המשלוח חינם. זמן האספקה המשוער הוא 7–14 ימי עסקים.')),
    ('אפשר להחזיר מוצר?', p('כן. אפשר להחזיר תוך 14 יום מקבלת המוצר, בלי דמי ביטול. פנו אלינו ונלווה את התהליך.')),
    ('מה כוללת האחריות?', p('שנה, על פגמי ייצור ותקלות במכשיר. שולחים לנו הודעה עם מספר ההזמנה, ואנחנו מתקנים או מחליפים.')),
    ('יש הזמנות בכמויות?', p('כן. לחברות ולארגונים יש מחירים מיוחדים ושירות אישי, בעמוד כמויות לחברות.')),
]))
home.dump('templates/index.json')

# --------------------------------------------------------------------------- product
prod = Template()
DETAILS = [
    ('detail', {'title': 'משלוח ואספקה', 'text': p(
        'המשלוח לישראל חינם. זמן האספקה המשוער הוא 7–14 ימי עסקים, אחרי עיבוד ההזמנה (עד 1–4 ימי עסקים), כמפורט במדיניות המשלוחים.',
        'אחרי שההזמנה נשלחת נשלח אליכם מספר מעקב, ככל שהוא זמין.')}),
    ('detail', {'title': 'החזרות', 'text': p(
        'אפשר להחזיר את המוצר תוך 14 יום מקבלתו, בלי צורך בסיבה ובלי דמי ביטול. עלות משלוח ההחזרה עלינו.')}),
    ('detail', {'title': 'אחריות ושירות', 'text': p(
        'אחריות לשנה על המכשיר, ישירות מ־LORINX. אנחנו זמינים בעברית לפני ואחרי הרכישה, בימים א׳–ה׳ 09:00–18:00.')}),
]
prod.add('main', 'lx2-product', {}, [
    ('intro', {'only_for': CUP,
               'text': 'ואקום שמושך וחום שמרפה. רבע שעה לאזור, בבית, בזמן שנוח לכם.',
               'points': '12 דרגות עוצמה, מתחילים נמוך ועולים בהדרגה\nחימום מבוקר ואור אדום\nאלחוטית ונטענת\nכיבוי אוטומטי אחרי 15 דקות'}),
    ('intro', {'only_for': GUN,
               'text': 'עיסוי ממוקד לכל קבוצת שריר, בכמה דקות, בבית או בחדר הכושר.',
               'points': '30 דרגות עוצמה\n6 ראשים מתחלפים\nמנוע שקט, טעינת USB-C\n1–2 דקות לכל אזור'}),
    ('intro', {'only_for': FOOT,
               'text': 'לחץ אוויר, עיסוי נקודתי וחימום עדין. עשרים דקות בכורסה בסוף היום.',
               'points': 'לחץ אוויר ועיסוי נקודתי יחד\nחימום עדין מובנה\nתוכניות מוכנות בלחיצת כפתור\nכיסוי פנימי נשלף לכביסה'}),
    ('intro', {'only_for': THIGH,
               'text': 'אימון התנגדות ממוקד לירכיים ולישבן, בכמה דקות ביום, בסלון.',
               'points': 'קפיץ עמיד עם התנגדות אמיתית\nריפוד רך לברכיים\nמתקפל, נכנס מתחת למיטה\n5–10 דקות ביום'}),
] + DETAILS)

# ---- cupping device
prod.add('cup_features', 'lx2-list', {
    'only_for': CUP, 'tone': 'dark', 'layout': 'split', 'numbered': True,
    'eyebrow': 'מה יש בפנים', 'heading': 'שגרה ביתית, בשליטה מלאה שלכם.',
    'text': 'אחרי יום ארוך מול מחשב או על הרגליים: שאיבה מדורגת, חימום ואור אדום, לרבע שעה בבית.',
}, items([
    ('שאיבה דיגיטלית', 'ואקום מדורג שמתאימים בלחיצה לתחושה שנוחה לכם.'),
    ('חימום מבוקר', 'חום הדרגתי ונעים.'),
    ('אור אדום', 'משולב במכשיר ופועל יחד עם השאיבה והחימום.'),
    ('12 דרגות עוצמה', 'מתחילים בדרגה 1 ועולים בהדרגה לפי התחושה.'),
    ('אלחוטית ונטענת', 'בלי כבלים בזמן השימוש. עובדת בכל מקום בבית.'),
]))
prod.add('cup_video', 'lx2-media-text', {
    'only_for': CUP, 'tone': 'bg', 'ratio': '1', 'flip': True,
    'video_url': 'https://cdn.shopify.com/videos/c/vp/038a9361961c4cdbb8c231811779a389/038a9361961c4cdbb8c231811779a389.HD-1080p-7.2Mbps-93708783.mp4',
    'image': img('Bazaart_1.jpg'),
    'eyebrow': 'בפעולה', 'heading': 'שלושה צעדים, רבע שעה.',
    'text': p('מצמידים את הכוס לאזור, בוחרים דרגת שאיבה וחימום, והמכשיר נכבה מעצמו בסוף השימוש.'),
})
prod.add('cup_moments', 'lx2-media-text', {
    'only_for': CUP, 'tone': 'surface', 'ratio': '45',
    'image': img('ChatGPT_Image_Jul_28_2026_10_48_27_PM.png'),
    'eyebrow': 'מתי משתמשים', 'heading': 'שלושה רגעים ביום.',
}, checks([
    'בבוקר, על הגב התחתון, לפני שהיום מתחיל.',
    'אחרי יום מול המחשב, על הכתפיים, בסלון מול הטלוויזיה.',
    'אחרי אימון או ריצה, על השוקיים והירכיים.',
]))
prod.add('cup_audience', 'lx2-list', {
    'only_for': CUP, 'tone': 'bg', 'layout': 'cols-3', 'numbered': False,
    'eyebrow': 'למי זה מתאים', 'heading': 'למי שהגוף שלו עובד קשה.',
}, items([
    ('עובדים מול מחשב', 'שעות ישיבה שמצטברות בכתפיים ובצוואר.'),
    ('ספורטאים ומתאמנים', 'שרירים עמוסים בין אימון לאימון.'),
    ('עבודה פיזית', 'הרמות, עמידה ממושכת ומאמץ חוזר.'),
    ('הורים עסוקים', 'רבע שעה בבית, בלי לתאם ובלי לנסוע.'),
    ('סוף יום ארוך', 'רגע של שחרור לגב, בלי לצאת מהבית.'),
    ('שגרה קבועה', 'הרגל קצר שקל להתמיד בו.'),
]))
prod.add('cup_timeline', 'lx2-list', {
    'only_for': CUP, 'tone': 'sand', 'layout': 'timeline',
    'eyebrow': 'מה לצפות', 'heading': 'מהשימוש הראשון ועד שזה הופך להרגל.',
    'note': WELLNESS_NOTE,
}, timeline([
    ('שימוש ראשון', 'מכירים את המכשיר בדרגה הנמוכה. ייתכן סימן עגול קל על העור במקום שבו הונחה הכוס.'),
    ('השבוע הראשון', 'מוצאים את דרגת העוצמה והחום שנוחות לכם, ואת האזורים שבהם הכי נעים להשתמש.'),
    ('שבוע שני ואילך', 'השימוש נכנס לשגרה: רבע שעה בערב, בלי להתארגן.'),
]))
prod.add('cup_why', 'lx2-media-text', {
    'only_for': CUP, 'tone': 'bg', 'ratio': '32', 'flip': True,
    'image': img('ChatGPT_Image_Jul_28_2026_10_31_46_PM.png'),
    'eyebrow': 'למה LORINX', 'heading': 'מכשיר אחד, ומישהו שעומד מאחוריו.',
}, checks([
    'שאיבה דיגיטלית עם 12 דרגות',
    'חימום ואור אדום משולבים',
    'שקטה ונוחה לשימוש בסלון',
    'כיבוי אוטומטי בסוף השימוש',
    'אחריות לשנה, ישירות מ־LORINX',
    'שירות ותמיכה בעברית',
]))
prod.add('cup_use', 'lx2-dos-donts', {
    'only_for': CUP, 'tone': 'surface', 'eyebrow': 'שימוש נכון', 'heading': 'כמה כללים פשוטים.',
    'do_title': 'כדאי',
    'do_list': 'להתחיל בעוצמה הנמוכה ביותר\nלהשתמש על עור נקי ויבש\nלהשאיר במקום עד 15 דקות\nלהשתמש על גב, כתפיים, שוקיים וירכיים\nלשתות מים אחרי השימוש',
    'dont_title': 'להימנע',
    'dont_list': 'מהתחלה בעוצמה מקסימלית\nמשימוש על פצע או על עור מגורה\nמהשארה על אותו מקום מעל 15 דקות\nמשימוש על הפנים או על קדמת הצוואר\nמשימוש במקלחת או במים',
    'note': 'המכשיר אינו מתאים לנשים בהריון, לאנשים עם קוצב לב, עם בעיות קרישה או עם רגישות לחום, ללא ייעוץ רפואי. ' + WELLNESS_NOTE,
})
prod.add('cup_messages', 'lx2-reviews', {
    'only_for': CUP, 'tone': 'bg', 'eyebrow': 'מהלקוחות שלנו', 'heading': 'הודעות שקיבלנו.', 'shots_heading': '',
}, [('screenshot', {'image': img(n)}) for n in (
    'WhatsApp_Image_2026-09-05_at_14.35.47_5.jpg', 'WhatsApp_Image_2026-09-05_at_14.35.47_1.jpg',
    'WhatsApp_Image_2026-09-05_at_14.35.47_4.jpg', 'WhatsApp_Image_2026-09-05_at_14.35.47_3.jpg',
    'WhatsApp_Image_2026-09-05_at_14.35.47_2.jpg', 'WhatsApp_Image_2026-09-05_at_14.35.47.jpg')])
prod.add('cup_faq', 'lx2-faq', {
    'only_for': CUP, 'tone': 'surface', 'heading': 'לפני שמזמינים.',
    'text': 'המידע החשוב על כוס הרוח החשמלית, במקום אחד.', 'link_label': 'דברו איתנו', 'link_url': CONTACT_URL,
}, qa([
    ('למי המוצר מתאים?', p(
        'לנשים ולגברים שמחפשים דרך ביתית ונוחה להרפיית שרירים אחרי יום ארוך: עובדי משרד, נהגים, מתאמנים ומי שעומד שעות על הרגליים.',
        'המכשיר אינו מתאים לנשים בהריון, לאנשים עם קוצב לב, עם בעיות קרישה או עם רגישות לחום, ללא ייעוץ רפואי.')),
    ('כמה זמן נמשך שימוש?', p('הזמן המומלץ הוא 15 דקות לכל אזור, והמכשיר נכבה מעצמו אחרי 15 דקות. מומלץ להתחיל בעוצמה נמוכה ולהעלות בהדרגה.')),
    ('מתי מרגישים את ההשפעה?', p('התחושה משתנה מאדם לאדם. מומלץ להתחיל בדרגה נמוכה ולמצוא את השגרה שנוחה לכם.')),
    ('האם השימוש בטוח?', p(
        'המכשיר תוכנן לשימוש ביתי פשוט. אתם בוחרים את עוצמת הוואקום ואת רמת החימום, כך שאפשר להתחיל נמוך ולעלות בהדרגה.',
        'קראו את הוראות השימוש לפני ההפעלה, והימנעו משימוש על עור פצוע או מגורה ובאזורים רגישים.')),
    ('כמה זמן לוקח המשלוח?', p('המשלוח חינם. זמן האספקה המשוער הוא 7–14 ימי עסקים.')),
]))

# ---- massage gun
prod.add('gun_features', 'lx2-list', {
    'only_for': GUN, 'tone': 'dark', 'layout': 'split', 'numbered': True,
    'eyebrow': 'מה יש בפנים', 'heading': 'עיסוי ממוקד, מתי שנוח לכם.',
    'text': 'שרירים עמוסים אחרי אימון, כתפיים תפוסות אחרי יום מול מחשב. כמה דקות עם האקדח, בבית או בחדר הכושר.',
}, items([
    ('30 עוצמות', 'בחירה מדויקת של עוצמת הפעימה לכל אזור בגוף.'),
    ('6 ראשים מתחלפים', 'ראש מתאים לכל קבוצת שריר, מגב רחב ועד כף רגל.'),
    ('מנוע שקט', 'פעולה שקטה שמאפשרת שימוש גם בסלון בערב.'),
    ('סוללה נטענת', 'טעינת USB-C.'),
    ('אחיזה ארגונומית', 'ידית שמאפשרת להגיע גם לגב העליון.'),
]))
prod.add('gun_moments', 'lx2-media-text', {
    'only_for': GUN, 'tone': 'surface', 'ratio': '1',
    'image': img('ChatGPT_Image_Sep_6_2026_07_58_42_PM_84f86d8b-2191-472a-87e2-2788f5c5d7b2.png'),
    'eyebrow': 'מתי משתמשים', 'heading': 'לפני, אחרי, ובסוף היום.',
}, checks([
    'לפני אימון: שתי דקות על השריר העיקרי, כחלק מהחימום.',
    'אחרי אימון: עיסוי קצר על השרירים שעבדו.',
    'בסוף יום עבודה: על הכתפיים, בישיבה בסלון.',
]))
prod.add('gun_use', 'lx2-dos-donts', {
    'only_for': GUN, 'tone': 'bg', 'eyebrow': 'שימוש נכון', 'heading': 'כמה כללים פשוטים.',
    'do_title': 'כדאי',
    'do_list': 'להתחיל בעוצמה נמוכה ולעלות בהדרגה\nלבחור ראש שמתאים לקבוצת השריר\nלעבור בתנועה איטית לאורך השריר\nלעבוד 1–2 דקות בכל אזור\nלטעון את הסוללה במלואה לפני שימוש ארוך',
    'dont_title': 'להימנע',
    'dont_list': 'מהתחלה בעוצמה מקסימלית\nמשימוש על עצמות, מפרקים או פצעים\nמהשארה על אותה נקודה מעל שתי דקות\nמשימוש על הראש או על קדמת הצוואר\nמהמשך שימוש אם מרגישים כאב חד',
    'note': WELLNESS_NOTE,
})
prod.add('gun_faq', 'lx2-faq', {
    'only_for': GUN, 'tone': 'surface', 'heading': 'לפני שמזמינים.',
    'text': 'המידע החשוב על אקדח המסאז׳, במקום אחד.', 'link_label': 'דברו איתנו', 'link_url': CONTACT_URL,
}, qa([
    ('למי אקדח המסאז׳ מתאים?', p('למתאמנים, למי שמבלה שעות בישיבה או בעבודה פיזית, ולכל מי שרוצה לשלב עיסוי בשגרת היום.')),
    ('כמה זמן מומלץ להשתמש?', p('מומלץ להתחיל בדקה או שתיים בכל אזור, ולהימנע משימוש ממושך על אותה נקודה.')),
    ('מתי מרגישים את ההשפעה?', p('התחושה משתנה מאדם לאדם. מומלץ להתחיל בעוצמה נמוכה ולמצוא את הראש והעוצמה שנוחים לכם.')),
    ('האם השימוש בטוח?', p('בשימוש נכון ובהתאם להוראות היצרן, האקדח מיועד לשימוש ביתי נוח.')),
    ('כמה זמן לוקח המשלוח?', p('המשלוח חינם. זמן האספקה המשוער הוא 7–14 ימי עסקים.')),
]))

# ---- foot massager
prod.add('foot_features', 'lx2-list', {
    'only_for': FOOT, 'tone': 'dark', 'layout': 'split', 'numbered': True,
    'eyebrow': 'מה יש בפנים', 'heading': 'עשרים דקות בכורסה, בסוף היום.',
    'text': 'אחרי יום של עמידה או הליכה, הרגליים מרגישות כבדות. המסאז׳ר משלב לחץ אוויר, עיסוי נקודתי וחימום עדין.',
}, items([
    ('לחץ אוויר', 'שרוולים שעוטפים את הרגל בלחיצות מדורגות.'),
    ('עיסוי נקודתי', 'עיסוי ממוקד לכף הרגל ולעקב.'),
    ('חימום עדין', 'חום נעים שמוסיף לתחושת הנוחות.'),
    ('תוכניות מוכנות', 'מצבי עיסוי לבחירה בלחיצת כפתור אחת.'),
    ('שליטה קלה', 'לוח הפעלה פשוט, בהישג יד.'),
]))
prod.add('foot_moments', 'lx2-media-text', {
    'only_for': FOOT, 'tone': 'surface', 'ratio': '1',
    'image': img('Bazaart_1_4024a01b-6560-45d9-bfbe-cf06e40db052.jpg'),
    'eyebrow': 'מתי משתמשים', 'heading': 'שלושה רגעים שבהם הרגליים אומרות תודה.',
}, checks([
    'אחרי יום עמידה: עשרים דקות בכורסה.',
    'אחרי ריצה או הליכה ארוכה.',
    'לפני השינה, כדי לסיים את היום ברוגע.',
]))
prod.add('foot_use', 'lx2-dos-donts', {
    'only_for': FOOT, 'tone': 'bg', 'eyebrow': 'שימוש נכון', 'heading': 'כמה כללים פשוטים.',
    'do_title': 'כדאי',
    'do_list': 'להשתמש בישיבה נוחה עם גב נתמך\nלהתחיל בעוצמת לחץ נמוכה\nלהשתמש 15–30 דקות בכל פעם\nלגרוב גרביים דקות אם החום חזק מדי\nלנקות את הכיסוי הפנימי מדי פעם',
    'dont_title': 'להימנע',
    'dont_list': 'משימוש מיד אחרי ארוחה כבדה\nמשימוש על עור פצוע או מגורה\nמעמידה על המכשיר או מהעמסת משקל עליו\nמשימוש של יותר מ־30 דקות ברצף\nמהרטבת יחידת המנוע',
    'note': WELLNESS_NOTE,
})
prod.add('foot_faq', 'lx2-faq', {
    'only_for': FOOT, 'tone': 'surface', 'heading': 'לפני שמזמינים.',
    'text': 'המידע החשוב על מסאז׳ר הרגליים, במקום אחד.', 'link_label': 'דברו איתנו', 'link_url': CONTACT_URL,
}, qa([
    ('למי המוצר מתאים?', p('לכל מי שמרגיש עייפות ברגליים אחרי יום עבודה, עמידה ממושכת, הליכה או פעילות גופנית, ולמי שפשוט רוצה עיסוי נוח בבית.')),
    ('כמה זמן מומלץ להשתמש?', p('בדרך כלל 15–30 דקות, לפי הנוחות האישית.')),
    ('מתי מרגישים את ההשפעה?', p('התחושה משתנה מאדם לאדם. מומלץ להתחיל בדרגה נמוכה ולמצוא את השגרה שנוחה לכם.')),
    ('האם השימוש בטוח?', p('בשימוש בהתאם להוראות היצרן, המכשיר מיועד לשימוש ביתי ונוח.')),
    ('כמה זמן לוקח המשלוח?', p('המשלוח חינם. זמן האספקה המשוער הוא 7–14 ימי עסקים.')),
]))

# ---- thigh trainer
prod.add('thigh_features', 'lx2-list', {
    'only_for': THIGH, 'tone': 'dark', 'layout': 'split', 'numbered': True,
    'eyebrow': 'מה יש בפנים', 'heading': 'אימון קצר, בלי לצאת מהבית.',
    'text': 'בלי מנוי, בלי נסיעות ובלי ציוד נוסף. כמה דקות ביום, בסלון, מול הטלוויזיה.',
}, items([
    ('התנגדות איכותית', 'קפיץ עמיד שנותן עומס אמיתי לשרירי הירך.'),
    ('ריפוד רך', 'כריות נוחות שמפחיתות לחץ על הברכיים.'),
    ('אימון קצר', 'חמש עד עשר דקות ביום מספיקות כדי להתחיל.'),
    ('מתקפל וקומפקטי', 'נכנס מתחת למיטה או בפינה בארון.'),
    ('לכל רמה', 'מתחילים ומתקדמים משתמשים באותו מכשיר.'),
]))
prod.add('thigh_moments', 'lx2-media-text', {
    'only_for': THIGH, 'tone': 'surface', 'ratio': '1',
    'image': img('Bazaart_3.jpg'),
    'eyebrow': 'מתי משתמשים', 'heading': 'שלושה רגעים לאימון קצר.',
}, checks([
    'בבוקר, עם הקפה: חמש דקות לפני שהיום מתחיל.',
    'בערב, מול הטלוויזיה: סט קצר על הספה.',
    'כחימום לפני אימון אחר.',
]))
prod.add('thigh_use', 'lx2-dos-donts', {
    'only_for': THIGH, 'tone': 'bg', 'eyebrow': 'אימון נכון', 'heading': 'כמה כללים פשוטים.',
    'do_title': 'כדאי',
    'do_list': 'לשבת זקוף עם גב נתמך\nלהתחיל בסטים קצרים של 10–15 חזרות\nלנשום באופן קבוע לאורך התרגיל\nלהוסיף חזרות בהדרגה לאורך שבועות\nלתת לגוף יום מנוחה בין אימונים',
    'dont_title': 'להימנע',
    'dont_list': 'מהתחלה בכמות חזרות גבוהה מדי\nמנעילת נשימה בזמן המאמץ\nמאימון דרך כאב חד בברך או בירך\nמאימון על משטח חלקלק ולא יציב\nמוויתור על חימום קצר לפני האימון',
    'note': 'התוצאות משתנות מאדם לאדם ותלויות בתדירות השימוש, בעצימות האימונים ובתזונה.',
})
prod.add('thigh_faq', 'lx2-faq', {
    'only_for': THIGH, 'tone': 'surface', 'heading': 'לפני שמזמינים.',
    'text': 'המידע החשוב על מאמן הירכיים, במקום אחד.', 'link_label': 'דברו איתנו', 'link_url': CONTACT_URL,
}, qa([
    ('למי מאמן הירכיים מתאים?', p('למי שרוצה לשלב אימון ממוקד לשרירי הירכיים בשגרת היום.')),
    ('כמה זמן מומלץ להתאמן?', p('אין זמן אחד שמתאים לכולם. מומלץ להתחיל בהדרגה, לפי היכולת האישית.')),
    ('מתי רואים תוצאות?', p('התוצאות משתנות מאדם לאדם ותלויות בתדירות השימוש, בעצימות האימונים ובתזונה.')),
    ('האם השימוש בטוח?', p('בשימוש נכון ובהתאם להוראות היצרן, המכשיר מיועד לשימוש ביתי.')),
    ('כמה זמן לוקח המשלוח?', p('המשלוח חינם. זמן האספקה המשוער הוא 7–14 ימי עסקים.')),
]))

prod.add('cta', 'lx2-cta', {
    'tone': 'dark', 'aura': True, 'heading': 'מוכנים לנסות?',
    'text': 'משלוח חינם, 14 יום להחזרה ואחריות לשנה.', 'cta_label': 'חזרה לבחירת הכמות',
})
prod.add('more', 'lx2-products', {
    'collection': COLLECTION, 'tone': 'bg', 'eyebrow': 'עוד מ־LORINX', 'heading': 'אולי יתאים לכם גם.',
    'limit': 4, 'hide_current': True,
})
prod.dump('templates/product.json')

# --------------------------------------------------------------------------- collection / search / cart / 404 / pages
Template().add('main', 'lx2-collection', {
    'eyebrow': 'הקולקציה', 'all_title': 'ריקוברי ביתי, מכשיר לכל צורך.',
    'text': 'מכשירים לשחרור שרירים ולהרפיה בבית, עם אחריות לשנה ושירות בעברית.',
}).add('assure', 'lx2-facts', {'tone': 'surface', 'label': 'התחייבויות השירות שלנו'}, ASSURE).dump('templates/collection.json')

Template().add('main', 'lx2-search').dump('templates/search.json')
Template().add('main', 'lx2-cart').add('assure', 'lx2-facts', {'tone': 'surface', 'label': 'התחייבויות השירות שלנו'}, ASSURE).dump('templates/cart.json')
Template().add('main', 'lx2-404').add('products', 'lx2-products', {
    'collection': COLLECTION, 'tone': 'surface', 'heading': 'אולי חיפשתם את אלה.', 'limit': 4,
}).dump('templates/404.json')

Template().add('main', 'lx2-page', {'show_content': True}).add('products', 'lx2-products', {
    'collection': COLLECTION, 'tone': 'surface', 'eyebrow': 'הקולקציה', 'heading': 'המוצרים שלנו.',
    'link_label': 'לכל המוצרים', 'limit': 4,
}).dump('templates/page.json')

about = Template()
about.add('main', 'lx2-page', {
    'eyebrow': 'הסיפור שלנו', 'heading': 'לפעמים מותג לא מתחיל במוצר. הוא מתחיל בתחושה.',
    'text': 'לפני ש־LORINX הייתה אתר, לוגו, אריזות או הזמנות, היה רעיון.', 'show_content': False, 'wide': True,
})
about.add('start', 'lx2-list', {
    'tone': 'surface', 'layout': 'split', 'numbered': False, 'eyebrow': '01 · ההתחלה',
    'heading': 'למה כל כך קשה למצוא מוצרים שבאמת מרגישים שנבחרו בשבילנו?',
}, items([
    ('', 'הרעיון נולד מתוך שנים של עבודה, ניסיון והיכרות עם עולם המוצרים, ומתוך שאלה אחת שחזרה על עצמה.'),
    ('', 'בדרך ראינו מוצרים שנראים מעולה מבחוץ אבל לא מספקים את מה שהבטיחו, וראינו מוצרים פשוטים שנשארו בבית שנים. שם התחיל להתגבש הרעיון של LORINX.'),
]))
about.add('idea', 'lx2-list', {
    'tone': 'bg', 'layout': 'split', 'numbered': True, 'eyebrow': '02 · הרעיון',
    'heading': 'לא רצינו להקים עוד חנות. רצינו לבנות מותג עם אופי.',
    'text': 'החלק הקל הוא למצוא מוצר. החלק הקשה הוא למצוא מוצר שראוי להיות חלק מהמותג. לפני שמוצר נכנס, אנחנו שואלים ארבע שאלות.',
    'note': 'אם התשובה לא הייתה ״כן״ אמיתי, המשכנו הלאה.',
}, items([
    ('האם הוא באמת שימושי?', ''),
    ('האם הוא הופך את היום לנוח יותר?', ''),
    ('האם האיכות מספיקה כדי לעמוד מאחוריו?', ''),
    ('היינו שמחים לקבל אותו הביתה?', ''),
]))
about.add('values', 'lx2-list', {
    'tone': 'dark', 'layout': 'cols-2', 'numbered': False, 'eyebrow': '03 · הערכים שלנו', 'heading': 'מה חשוב לנו באמת.',
}, items([
    ('איכות לפני כמות', 'אנחנו מעדיפים לבחור נכון מאשר לבחור הרבה.'),
    ('ערך לפני טרנד', 'לא כל דבר פופולרי הוא דבר שאנחנו צריכים.'),
    ('אמינות לפני הבטחות', 'מוצר צריך לדבר בעד עצמו.'),
    ('אנשים לפני הכול', 'מאחורי כל הזמנה עומד אדם שנתן לנו את האמון שלו.'),
]))
about.add('trust', 'lx2-cta', {
    'tone': 'sand', 'eyebrow': '04 · אמון',
    'heading': 'כשמישהו בוחר לקנות מאיתנו, הוא נותן לנו משהו שאי אפשר למדוד בכסף.',
    'text': 'אמון שהמוצר שווה את הכסף, שהוא באמת כמו שתיארנו אותו, ושנהיה שם אם תצטרכו אותנו. מבחינתנו, זו אחריות.',
    'cta_label': 'לכל המוצרים', 'cta_url': ALL_URL, 'link_label': 'דברו איתנו', 'link_url': CONTACT_URL,
})
about.dump('templates/page.about.json')

contact = Template()
contact.add('main', 'lx2-page', {
    'eyebrow': 'צרו קשר', 'heading': 'יש לכם שאלה? אנחנו כאן.',
    'text': 'מלאו את הטופס ונחזור אליכם בהקדם. נשמח לעזור בבחירת המכשיר, בשימוש נכון ובכל בקשת אחריות.',
    'show_content': False, 'wide': True,
})
contact.add('form', 'lx2-contact', {'heading': 'כתבו לנו', 'tone': 'surface'}, [
    ('detail', {'label': 'אימייל', 'value': 'mylorinx@gmail.com', 'url': 'mailto:mylorinx@gmail.com', 'text': 'שלחו לנו מייל ונחזור אליכם עם תשובה מלאה.'}),
    ('detail', {'label': 'ווטסאפ', 'value': '054-2575809', 'url': 'https://wa.me/972542575809', 'text': 'מענה מהיר בשעות הפעילות.'}),
    ('detail', {'label': 'זמני מענה', 'value': 'ימים א׳–ה׳ · 09:00–18:00', 'text': 'מחוץ לשעות אלו נחזור אליכם ביום העסקים הבא.'}),
])
contact.add('faq', 'lx2-faq', {'tone': 'bg', 'eyebrow': 'שאלות שחוזרות אצלנו', 'heading': 'אולי התשובה כבר כאן.'}, qa([
    ('כמה זמן לוקח המשלוח?', p('המשלוח חינם. זמן האספקה המשוער הוא 7–14 ימי עסקים.')),
    ('אפשר להחזיר מוצר?', p('כן. אפשר להחזיר תוך 14 יום מקבלת המוצר, בלי דמי ביטול. פנו אלינו ונלווה את התהליך.')),
    ('מה כוללת האחריות?', p('אחריות לשנה על המכשיר, כולל מענה ותמיכה בעברית.')),
    ('יש הזמנות בכמויות?', p('כן. לחברות ולארגונים יש מחירים מיוחדים ושירות אישי, בעמוד כמויות לחברות.')),
]))
contact.dump('templates/page.contact.json')

b2b = Template()
b2b.add('main', 'lx2-page', {
    'eyebrow': 'כמויות לחברות', 'heading': 'הזמנות בכמויות גדולות לעסקים.',
    'text': 'מחפשים מתנה איכותית ושימושית לעובדים, ללקוחות או לשותפים עסקיים? נבנה לכם הצעה מותאמת, כולל מיתוג ואספקה מרוכזת.',
    'cta_label': 'קבלו הצעת מחיר', 'cta_url': '#contact-form', 'link_label': 'לכל המוצרים', 'link_url': ALL_URL,
    'show_content': False, 'wide': True,
})
b2b.add('audience', 'lx2-list', {
    'tone': 'surface', 'layout': 'cols-3', 'numbered': False, 'eyebrow': 'למי זה מתאים', 'heading': 'מתנה שמשתמשים בה.',
}, items([
    ('מתנות לעובדים', 'מתנה שימושית ומפנקת מהחברה.'),
    ('חברות וארגונים', 'פתרון נוח להזמנות מרוכזות לצוותים.'),
    ('לקוחות ושותפים', 'דרך להודות לאנשים שעובדים איתכם.'),
    ('אירועים וכנסים', 'ימי גיבוש, אירועי חברה וכנסים.'),
    ('מועדוני לקוחות', 'רכישה מרוכזת לקהילות ולמסגרות גדולות.'),
]))
b2b.add('terms', 'lx2-facts', {'tone': 'dark', 'label': 'מה מקבלים'}, facts([
    ('check', 'מחירים מיוחדים', 'להזמנות בכמויות גדולות.'),
    ('chat', 'שירות אישי', 'ליווי אישי לעסקים.'),
    ('truck', 'הזמנה מרוכזת', 'הכול במקום אחד.'),
    ('levels', 'התאמה לכמות', 'פתרונות לפי היקף ההזמנה.'),
]))
b2b.add('products', 'lx2-products', {'collection': COLLECTION, 'tone': 'bg', 'heading': 'המוצרים שלנו.', 'limit': 4})
b2b.add('form', 'lx2-contact', {
    'heading': 'נבנה לכם הצעה מותאמת', 'tone': 'surface',
    'name_label': 'שם החברה / איש קשר', 'body_label': 'כמות מבוקשת והודעה',
}, [
    ('detail', {'label': 'אימייל', 'value': 'mylorinx@gmail.com', 'url': 'mailto:mylorinx@gmail.com', 'text': 'ספרו לנו על הכמות, התקציב והמועד, ונחזור עם הצעה, זמני אספקה ואפשרויות מיתוג.'}),
    ('detail', {'label': 'זמני מענה', 'value': 'ימים א׳–ה׳ · 09:00–18:00', 'text': ''}),
])
b2b.dump('templates/page.b2b.json')
