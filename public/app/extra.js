(function () {
'use strict';
/* Legal pages, Help & FAQ, first-time tour and Home checklist */
var Z = window.Z, S = Z.S, esc = Z.esc, ic = Z.ic, SCR = Z.SCR, H = Z.helpers;
var TERMS_VERSION = '2026-10-16';
var SUPPORT = { wa: '', email: 'zyronstudio800@gmail.com', channel: '' };
Z.TERMS_VERSION = TERMS_VERSION; Z.SUPPORT = SUPPORT;
Z.VAPID_PUBLIC = 'BGTtH2P-4AYat9bvadwblrvZ9z1dVCrBQuzROUaBBdpPRea_TkbrhZHgcVK0Bz0DfMoWzm04xW6L3Uej9AZcdx4';
Z.pushSupported = function () { return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && window.isSecureContext; };
Z.pushBlocked = function () { return Z.pushSupported() && Notification.permission === 'denied'; };

function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { /* ignore */ } return null; }
function uid() { return (S.user && S.user.id) || 'anon'; }
function supportHref(msg) {
  if (SUPPORT.wa) return 'https://wa.me/' + SUPPORT.wa + '?text=' + encodeURIComponent(msg || 'Hi Zyron, I need help with');
  return 'mailto:' + SUPPORT.email + '?subject=' + encodeURIComponent('Zyron support');
}
Z.supportHref = supportHref;

/* ---------------- Terms ---------------- */
var TERMS = [
  ['About Zyron', 'Zyron is an invoicing app for people and businesses in Nigeria. It is built and run by Zyron Studio in Lagos, Nigeria. By using Zyron you agree to these Terms. If you do not agree, please do not use it.'],
  ['Who can use Zyron', 'Zyron is for lawful business use. You must be 18 or older, or use Zyron with the knowledge and permission of a parent or guardian. You are responsible for the details you give us and for keeping your Google account secure.'],
  ['Signing in', 'You sign in with Google. We receive your name and email address from Google so we can create your Zyron workspace. We never see your Google password.'],
  ['Free trial', 'New accounts get a free trial that lasts 2 months (60 days). During the trial you can create up to 15 invoices, and trial invoices show a "Zyron Trial" watermark. One trial is allowed per person. We may refuse or end a trial if we believe it is being abused, for example by creating many accounts or using temporary email addresses.'],
  ['Limited access and waitlist', 'Zyron is opened to a limited number of members at a time so the service stays fast and reliable. We may close, reopen or enlarge membership, and place new people on a waitlist, at our discretion. People on the waitlist are only contacted on WhatsApp if they agreed to it, and can ask us to stop at any time. Existing members keep their access while they follow these Terms.'],
  ['Plans and payment','The planned prices are ₦10,000 per month or ₦100,000 per year. Paid plans are not switched on yet. Before we charge you anything we will tell you clearly, and you will have to choose a plan yourself. Prices may change for future billing periods, and we will give notice first.'],
  ['Your invoices and your clients', 'You are responsible for everything on your invoices: the amounts, descriptions, taxes, bank details and payment links. Zyron is a tool for making and sharing invoices. We do not collect money from your clients, hold your money, or guarantee that anyone will pay. Zyron does not give legal, accounting or tax advice, and it is not connected to the Nigerian government e-invoicing system. You must follow the tax and business laws that apply to you.'],
  ['Payment links and QR codes', 'If you add a payment link, your client is sent to the page you chose. You are responsible for that link. Do not add links that are misleading, unsafe or not yours. We may remove links that look fraudulent.'],
  ['What you must not do', 'Do not use Zyron for fraud, fake or misleading invoices, impersonation, harassment or spam. Do not try to break, copy, overload or bypass the limits of the service. Do not use Zyron to break the law.'],
  ['Deleting your account and inactive accounts', 'You can delete your account yourself in Settings. This permanently removes your profile, clients, invoices, payments and logo, and it cannot be undone. Invoices you already sent stop working for your clients. Download your invoices first if you want a copy. A deleted account cannot be reopened, and the same email cannot be used to start a new free trial. If an account has no activity for 120 days (180 days if notifications are off) we delete it automatically. If you turned notifications on, we send you a warning notification 20 days before. Signing in at any time resets the count. Accounts with an active paid plan are not deleted for inactivity.'],
  ['Notifications', 'If you turn on notifications, Zyron can send messages to your phone when a client opens or pays an invoice, when an invoice becomes overdue, and about your account. You can turn them off any time in Settings or in your phone settings.'],
  ['Your content', 'You own your data. You allow us to store it and show it to the people you send invoices to, so the service can work. You can ask us to delete your data at any time.'],
  ['Availability and changes', 'We work hard to keep Zyron running, but we cannot promise it will always be available or error-free. We may add, change or remove features.'],
  ['Suspension and ending', 'You can stop using Zyron at any time. We may suspend or close an account that breaks these Terms or puts others at risk.'],
  ['Our responsibility', 'Zyron is provided "as is". To the extent the law allows, Zyron Studio is not responsible for lost income, lost profits or indirect losses, and our total responsibility for any claim is limited to the amount you paid us in the last 12 months. Nothing in these Terms removes rights you have under Nigerian law that cannot be removed.'],
  ['Governing law', 'These Terms are governed by the laws of the Federal Republic of Nigeria.'],
  ['Changes to these Terms', 'We may update these Terms. When we make an important change we will ask you to accept the new version.'],
  ['Contact', 'Questions about these Terms? Contact us through the Help page in the app.']
];
var PRIVACY = [
  ['Who we are', 'Zyron is run by Zyron Studio in Lagos, Nigeria. This policy explains what personal data we collect, why, and the choices you have. We aim to follow the Nigeria Data Protection Act 2023.'],
  ['What we collect', '<ul><li><b>Your account:</b> name and email address from your Google sign-in.</li><li><b>Your business details:</b> business name, phone, address, website, logo, bank details and payment link, but only what you choose to enter.</li><li><b>Your work:</b> clients, invoices, payments you record, templates and notes you create.</li><li><b>Activity:</b> when a client opens an invoice and how many times, so we can tell you.</li><li><b>Your consent:</b> the Terms version you accepted and when.</li></ul>'],
  ['Your clients\' information', 'When you add a client, you are the one deciding what to store about them. Please only enter information you have a good reason to hold, and tell your clients how you use it. We store it for you and do not use it for ourselves.'],
  ['Why we use it', 'To run Zyron: sign you in, create and send invoices, show your dashboard, track payments and overdue invoices, keep the service secure, stop abuse of the free trial, and help you when you contact us.'],
  ['Who we share it with', '<ul><li><b>Your clients</b> see the invoice you send them, including your business name, logo and the bank or payment details you put on it.</li><li><b>Service providers</b> that help us run Zyron: Supabase (database and sign-in, data stored in Paris, France), Vercel (website hosting) and Google (sign-in).</li><li>The authorities, if the law requires it.</li></ul><p style="margin-top:8px">We do not sell your data. We do not run advertising on Zyron.</p>'],
  ['Sending invoices', 'When you tap WhatsApp, email or share, your phone opens that app with the message ready. The message goes from you, not from Zyron.'],
  ['How long we keep it', 'We keep your data while your account is open. You can delete your account in Settings, which removes your personal data straight away, except what we must keep for security, fraud prevention or the law. We keep a record of the email addresses that have used a trial, with no link to your account, so trials cannot be repeated. Accounts with no activity for 120 days (180 days if notifications are off) are deleted automatically.'],
  ['Notifications', 'If you turn on notifications we store a push address for your device so we can reach it. We use it only for messages about your invoices and your account. You can remove it by turning notifications off. It is deleted with your account.'],
  ['Your rights', 'You can ask to see, correct or delete your data, to object to how we use it, or to withdraw your consent. Contact us through the Help page and we will reply within a reasonable time. You can also complain to the Nigeria Data Protection Commission.'],
  ['Security', 'Your data is stored in a database where each account can only see its own records. Payments and invoice status are controlled by the server. No system is perfectly secure, so please keep your Google account safe.'],
  ['Children', 'Zyron is for people aged 18 and over, or younger people using it with a parent or guardian\'s permission.'],
  ['Changes', 'If we change this policy in an important way we will tell you in the app.'],
  ['Contact', 'Privacy questions or requests? Contact us through the Help page in the app.']
];
function legalHTML(title, sections) {
  var back = S.user ? '#/more' : '#/auth';
  return '<div class="legal"><div class="topbar" style="padding:0"><button class="icon-btn" data-act="go" data-to="' + back + '" aria-label="Back">' + ic('back') + '</button><h1>' + esc(title) + '</h1></div>' +
    '<p style="color:var(--text)">Version ' + esc(TERMS_VERSION) + '</p>' +
    sections.map(function (x, i) { return '<h2>' + (i + 1) + '. ' + esc(x[0]) + '</h2>' + (x[1].charAt(0) === '<' ? x[1] : '<p>' + esc(x[1]) + '</p>'); }).join('') + '</div>';
}
SCR.terms = function () { return legalHTML('Terms of Use', TERMS); };
SCR.privacy = function () { return legalHTML('Privacy Policy', PRIVACY); };

/* ---------------- Help & FAQ ---------------- */
var FAQ = [
  ['How do I create and send my first invoice?', 'Tap the gold + button, choose or add a client, add what you did and the price, then tap Preview invoice and Send. Zyron gives you a secure link that you can send on WhatsApp, by email, or copy.'],
  ['How do I add my logo?', 'Go to More, then Business profile, then tap Upload logo. A PNG or JPG works best. Your logo then shows on all your invoices.'],
  ['How do I add my bank details?', 'Go to More, then Business profile, and fill in "Where clients pay you". The bank name, account number and account name appear on your invoices with a Copy button for your client.'],
  ['How do I know when my client has opened the invoice?', 'Zyron records the first time your client opens the link. You see it on the invoice, on your Home screen, and in the bell. It tells you the link was opened, not that they have read it or agreed to pay.'],
  ['How do I record a payment?', 'Open the invoice and tap Record payment. You can record a part payment too. Zyron tracks the balance and marks the invoice Paid when it is fully paid.'],
  ['What does "I have paid" on the client page do?', 'When your client taps it, you get a notice that they say they have paid. Check your bank account first, then record the payment yourself. Zyron never marks an invoice paid on its own.'],
  ['How do the Pay now button and QR code work?', 'In Business profile you can paste a payment link from your own Paystack, Flutterwave or bank payment page. Your clients then see a Pay now button and a QR code on the invoice. Zyron never handles the money.'],
  ['What is the waitlist?', 'Zyron opens to a limited number of members at a time. When all spots are taken, new people can leave their WhatsApp number and we will message them when more spots open. If you are already a member, you can keep signing in with Google as normal.'],
  ['What is included in the free trial?', 'You get 2 months with every feature, up to 15 invoices, and a "Zyron Trial" watermark on invoices. Paid plans are not switched on yet, and you will not be charged unless you choose a plan.'],
  ['Why is there a watermark on my invoices?', 'Trial invoices carry a "Zyron Trial" watermark. It goes away on a paid plan.'],
  ['How do I save an invoice as a PDF?', 'Open the invoice, tap Share or Download PDF, then pick Elite dark or Print-friendly white. On the next screen choose Save as PDF.'],
  ['Can I change an invoice after sending it?', 'The amounts are locked after sending so the record stays honest. To change something, duplicate the invoice, fix it, and send the new one. You can cancel the old one if no payment was made.'],
  ['What are templates and recurring invoices?', 'Save any invoice as a template. You can create a new invoice from it in one tap, or set it to repeat on a schedule, which is useful for retainers and monthly work.'],
  ['How do I install Zyron on my phone?', 'On Android Chrome tap the three dots at the top right, then Install app or Add to Home screen. On iPhone Safari tap the Share icon, then Add to Home Screen.'],
  ['Is my data safe?', 'Each account can only see its own data, and the server controls invoice numbers, status and payments. See the Privacy Policy for more.'],
  ['How do I delete my account or my data?', 'Go to More, then Business profile, and tap Delete my account. You can download your invoices first. Deleting is permanent. Accounts with no activity for 120 days (180 if notifications are off) are deleted automatically, and we send a warning notification first if notifications are on.'],
  ['How do I get notifications?', 'Go to More, then Business profile, and tap Turn notifications on. Allow notifications when your phone asks. You will be told when a client opens or pays an invoice, even when Zyron is closed.']
];
SCR.help = function () {
  return '<div class="screen">' + H.bar('Help & FAQ') +
    '<div class="card" style="display:flex;flex-direction:column;gap:12px"><div class="eyebrow">Learn Zyron</div><p class="hint" style="margin:0">A 1-minute tour of the main things.</p><button class="btn btn-gold btn-block" data-act="tour-open">' + ic('spark', 'ic-sm') + 'Start the tour</button></div>' +
    '<div class="field"><label for="faqq">Search help</label><input class="in" id="faqq" type="search" placeholder="e.g. logo, payment, trial" autocomplete="off"></div>' +
    '<div class="faq" id="faqlist">' + FAQ.map(function (x) { return '<details data-q="' + esc((x[0] + ' ' + x[1]).toLowerCase()) + '"><summary>' + esc(x[0]) + '</summary><p>' + esc(x[1]) + '</p></details>'; }).join('') + '</div>' +
    '<p class="hint" id="faqnone" style="display:none;text-align:center">No answers found. Try another word or contact us below.</p>' +
    '<div class="card" style="display:flex;flex-direction:column;gap:10px"><div class="eyebrow">Still stuck?</div><a class="btn btn-block" target="_blank" rel="noopener" href="' + esc(supportHref('Hi Zyron, I need help with')) + '">' + ic('chat', 'ic-sm') + (SUPPORT.wa ? 'Chat with support on WhatsApp' : 'Email support') + '</a></div>' +
    '<p class="hint" style="text-align:center"><a class="inl" href="#/terms">Terms of Use</a> · <a class="inl" href="#/privacy">Privacy Policy</a></p></div>' + H.navHTML('more');
};
document.addEventListener('input', function (e) {
  if (!e.target || e.target.id !== 'faqq') return;
  var q = e.target.value.trim().toLowerCase(), n = 0;
  Z.$$('#faqlist details').forEach(function (d) { var m = !q || d.getAttribute('data-q').indexOf(q) >= 0; d.style.display = m ? '' : 'none'; if (m) n++; });
  var none = Z.$('#faqnone'); if (none) none.style.display = n ? 'none' : '';
});

/* ---------------- Tour ---------------- */
var TOUR = [
  ['spark', 'Welcome to Zyron', 'Invoices that look premium, get sent in seconds, and tell you when a client opens them. Here is a quick tour.'],
  ['user', 'Set up your business', 'Open More, then Business profile. Add your logo and bank details once, and they appear on every invoice.'],
  ['plus', 'Create an invoice', 'Tap the gold + button. Pick a client, add what you did and the price, choose a theme, then preview it.'],
  ['chat', 'Send it on WhatsApp', 'Tap Send and share the secure link. Your client opens a clean page with your bank details, and a Pay now button if you added a payment link.'],
  ['eye', 'Watch it get paid', 'See when your client opens it, record payments (even part payments), and use reminders for overdue invoices. Find answers any time in More, Help & FAQ.']
];
var tourStep = 0;
function tourSheet() {
  var t = TOUR[tourStep], last = tourStep === TOUR.length - 1;
  var body = '<div class="tour"><div class="tico">' + ic(t[0]) + '</div><h3>' + esc(t[1]) + '</h3><p>' + esc(t[2]) + '</p>' +
    '<div class="dots">' + TOUR.map(function (_, i) { return '<i class="' + (i === tourStep ? 'on' : '') + '"></i>'; }).join('') + '</div></div>' +
    '<div class="btn-row"><button class="btn btn-grow" data-act="tour-skip">' + (last ? 'Close' : 'Skip') + '</button><button class="btn btn-gold btn-grow" data-act="tour-next">' + (last ? 'Get started' : 'Next') + '</button></div>';
  if (Z.isSheetOpen() && Z.$('#shbody') && Z.$('#shbody').querySelector('.tour')) Z.setSheetBody(body); else Z.openSheet('Quick tour', body, function () { ls('zy_tour_' + uid(), '1'); });
}
Z.tourOpen = function () { tourStep = 0; tourSheet(); };
Z.tourNext = function () { if (tourStep < TOUR.length - 1) { tourStep++; tourSheet(); } else Z.closeSheet(); };
Z.tourMaybe = function () {
  if (!S.user || !S.profile || !S.profile.business_name) return;
  if (ls('zy_tour_' + uid())) return; ls('zy_tour_' + uid(), '1');
  setTimeout(function () { if (!Z.isSheetOpen() && (location.hash === '#/home' || location.hash === '' || location.hash === '#/')) Z.tourOpen(); }, 700);
};

/* ---------------- Home checklist ---------------- */
Z.checklistHTML = function () {
  var p = S.profile; if (!p || !p.business_name) return '';
  if (ls('zy_cl_' + uid()) === 'x') return '';
  var steps = [
    ['Add your logo', !!p.logo_url, '#/settings'],
    ['Add your bank details', !!p.account_number, '#/settings'],
    ['Create your first invoice', S.invoices.length > 0, '#/new'],
    ['Send your first invoice', S.invoices.some(function (i) { return i.status !== 'draft'; }), '#/invoices']
  ];
  var done = steps.filter(function (x) { return x[1]; }).length;
  if (done === steps.length) { ls('zy_cl_' + uid(), 'x'); return ''; }
  return '<section class="card" aria-label="Getting started"><div class="cap-top"><div class="eyebrow">Getting started · ' + done + ' of ' + steps.length + '</div><button class="link-btn" data-act="cl-hide" style="min-height:0;padding:0">Hide</button></div><div class="cl">' +
    steps.map(function (x) { return '<button class="' + (x[1] ? 'done' : '') + '" data-act="go" data-to="' + x[2] + '"><i>' + (x[1] ? ic('check') : '') + '</i><span>' + esc(x[0]) + '</span></button>'; }).join('') + '</div></section>';
};
Z.checklistHide = function () { ls('zy_cl_' + uid(), 'x'); };
})();
