// Generates src/data/feedback.json: 187 pieces of customer feedback for
// "Ledgerly", a fictional B2B invoicing & subscriptions SaaS.
// Every verbatim is hand-written. Ten rows arrive pre-tagged (someone started
// on Friday); the rest is the Monday-morning pile. About fifteen rows are
// semantic duplicates (the same bug reported in different words) so an agent
// has something intelligent to notice.
import { writeFileSync } from 'node:fs';

const S = { app: 'App Store', mail: 'Support email', survey: 'In-app survey', tw: 'Twitter', sales: 'Sales call' };

// [source, text, hiddenArea, hiddenSeverity, pretagged?]
const R = [
  // ─── Billing ────────────────────────────────────────────────────────────
  [S.mail, "We were charged twice for the August invoice run. Two identical Stripe charges, same amount, four minutes apart. Our finance lead has already flagged it internally and I need a refund confirmation today.", 'Billing', 'P0', true],
  [S.tw, "@ledgerly double-charged us this month. Two charges, same amount, minutes apart. Anyone else?", 'Billing', 'P0'],
  [S.mail, "Duplicate charge on our account on Aug 28. Card shows 2x $1,240. Please advise.", 'Billing', 'P0'],
  [S.mail, "Our customers are receiving invoices with the wrong currency symbol. We bill in EUR but the PDF shows $ next to the totals. Three clients have already asked if the amount is in dollars.", 'Billing', 'P1', true],
  [S.survey, "Invoice PDFs show $ instead of € for our EU customers. Embarrassing.", 'Billing', 'P1'],
  [S.mail, "VAT is being applied to a customer in Switzerland, which is not in the EU. We had to void and reissue the invoice by hand. Is there a way to override the tax rule per customer?", 'Billing', 'P1'],
  [S.app, "3 stars. Recurring invoices work but there is no way to pause a subscription for a month without cancelling it entirely. We have seasonal clients.", 'Billing', 'P2'],
  [S.survey, "Can't pause a subscription. Only cancel. Annoying for seasonal customers.", 'Billing', 'P2'],
  [S.mail, "When a card fails, the dunning email goes out immediately with no grace period. One of our biggest accounts got a 'your service will be suspended' email because of a bank hiccup. Please let us configure a retry window before any email is sent.", 'Billing', 'P1'],
  [S.sales, "Prospect (200-seat agency) asked whether dunning emails can be delayed or customized. Said the default tone is 'too aggressive for our clients'. Blocking for the deal.", 'Billing', 'P1'],
  [S.mail, "Credit notes do not reduce the outstanding balance on the customer portal. The customer sees the original invoice as unpaid even though we issued a credit for the full amount.", 'Billing', 'P1'],
  [S.survey, "Issued a credit note but the portal still says unpaid. Confusing for clients.", 'Billing', 'P1'],
  [S.mail, "The 'Send reminder' button sends the reminder to the billing contact only. Our clients often want reminders to go to their AP inbox as well. A CC field on reminders would fix this.", 'Billing', 'P2'],
  [S.tw, "Would love to CC a second email on payment reminders in @ledgerly. Small thing, big deal for our AP workflow.", 'Billing', 'P2'],
  [S.mail, "Proration on mid-cycle upgrades is rounding in our customers' favour by a cent or two on every line. It adds up: we lost about €340 last quarter to rounding. Can proration round half-up instead of down?", 'Billing', 'P2'],
  [S.survey, "Discount codes cannot be applied to an existing subscription, only at checkout.", 'Billing', 'P2'],
  [S.mail, "I need to apply a one-time discount to a customer who already has a running subscription. The only way I found is to cancel and recreate it, which resets their billing anchor. Surely there is a better way?", 'Billing', 'P2'],
  [S.app, "2 stars. Invoice numbering restarted at 0001 after I changed the prefix. Our accountant is furious because we now have duplicate invoice numbers across the year.", 'Billing', 'P0'],
  [S.mail, "Changing the invoice prefix reset our sequence to 1. We now have two invoices numbered LDG-0001. This is a legal problem in Germany.", 'Billing', 'P0'],
  [S.survey, "Please support annual billing with monthly usage add-ons on the same invoice.", 'Billing', 'P3'],
  [S.sales, "Enterprise prospect wants purchase order numbers printed on invoices and searchable. Currently only in the notes field. Not a blocker but came up twice.", 'Billing', 'P2'],
  [S.mail, "Where do I add a PO number? Our client rejects any invoice without one and I have been typing it in the notes box, which does not show up on the PDF.", 'Billing', 'P2'],
  [S.survey, "Late fees: we want to charge 1.5% per month automatically. No option for this.", 'Billing', 'P3'],
  [S.mail, "The customer portal lets clients download the invoice PDF but not the receipt after they pay. They keep emailing us for receipts.", 'Billing', 'P2'],
  [S.tw, "Why does @ledgerly not send a receipt after payment? My clients ask for one every single time.", 'Billing', 'P2'],
  [S.app, "4 stars. Solid product. Would give 5 if I could set different payment terms per customer (net 15 for some, net 45 for others) instead of one global default.", 'Billing', 'P2'],
  [S.mail, "Payment terms are global. We need per-customer terms. Our biggest client is net 60 by contract.", 'Billing', 'P2'],
  [S.mail, "An invoice marked as paid in Ledgerly was never actually collected. The webhook from Stripe said 'payment_intent.succeeded' but the funds never arrived because the payment was later disputed. Ledgerly did not reflect the dispute anywhere.", 'Billing', 'P1'],
  [S.survey, "Disputes / chargebacks are invisible in the app. Had to find out from Stripe.", 'Billing', 'P1'],
  [S.mail, "We cannot bill in more than one currency from the same account. We have UK and US clients and had to create a second workspace just for USD.", 'Billing', 'P1'],
  [S.sales, "Multi-currency was the first question on the call. Prospect has customers in 6 countries. They will not move forward without it.", 'Billing', 'P1'],
  [S.survey, "Refund partially? Only full refunds available.", 'Billing', 'P2'],
  [S.mail, "Trying to refund €50 of a €200 invoice. The refund dialog only offers the full amount. Had to do it in Stripe directly, and now Ledgerly and Stripe disagree on the balance.", 'Billing', 'P2'],
  [S.tw, "Tax-inclusive pricing please @ledgerly. Every B2C client I have wants to see the price with VAT baked in.", 'Billing', 'P3'],
  [S.mail, "The subscription renewal email goes out at 03:00 UTC, which is the middle of the night for our US clients and lands at the bottom of their inbox. Could we choose the send time?", 'Billing', 'P3'],
  [S.survey, "Love the invoicing. Hate that I can't see a running total of unpaid invoices per customer on the customer page.", 'Billing', 'P2'],
  [S.mail, "Customer page should show total outstanding. Right now I have to sum invoices myself.", 'Billing', 'P2'],
  [S.app, "1 star. Charged me for the Pro plan after I downgraded to Starter. The downgrade was confirmed by email. Still waiting on support after five days.", 'Billing', 'P0'],
  [S.mail, "I downgraded on Aug 20 and was still billed the Pro amount on Sep 1. Confirmation email attached. Please refund the difference.", 'Billing', 'P0'],
  [S.survey, "Auto-charge failed silently for a customer with an expired card. No notification to us at all.", 'Billing', 'P1'],
  [S.mail, "We only found out a client's card had expired when they called us to ask why they had not been charged. Ledgerly should notify the account owner when auto-collection fails.", 'Billing', 'P1'],
  [S.sales, "Asked about revenue recognition reports for annual plans. We don't have it. Prospect's CFO will not sign without deferred revenue schedules.", 'Billing', 'P2'],

  // ─── Onboarding ─────────────────────────────────────────────────────────
  [S.survey, "Took me 40 minutes to send my first invoice. Too many required fields on the company profile before you let me do anything.", 'Onboarding', 'P2', true],
  [S.app, "2 stars. The setup wizard forced me to connect a bank account before I could even look around the product. I just wanted to see what it does.", 'Onboarding', 'P1'],
  [S.tw, "Tried @ledgerly. Got asked for my bank details on screen two. Closed the tab.", 'Onboarding', 'P1'],
  [S.mail, "The CSV import for customers failed with 'row 1 invalid' and no other detail. I spent an hour guessing which column was wrong. It turned out the header had to be lowercase.", 'Onboarding', 'P1'],
  [S.survey, "Customer import: error message says 'invalid' with no hint. Give me the column name at least.", 'Onboarding', 'P1'],
  [S.mail, "Importing 1,400 customers from our old tool. The import silently dropped everyone without a phone number. There was no warning, we only noticed a week later.", 'Onboarding', 'P0'],
  [S.survey, "The sample data you pre-load is confusing. I thought those were real invoices and almost sent one.", 'Onboarding', 'P2'],
  [S.mail, "Please add a way to remove the demo invoices in one click. I deleted 20 of them by hand.", 'Onboarding', 'P2'],
  [S.app, "5 stars for the product, but the invite-your-team step happens before you have anything to show them. I invited my accountant into an empty workspace and she was confused.", 'Onboarding', 'P3'],
  [S.sales, "Prospect wants a guided migration from FreshBooks. We do CSV only. They have 3 years of history and asked who will do the mapping.", 'Onboarding', 'P2'],
  [S.mail, "Is there a FreshBooks importer? The CSV export from FreshBooks does not match your template and I do not want to reformat 3,000 rows.", 'Onboarding', 'P2'],
  [S.survey, "The onboarding checklist keeps reappearing after I dismissed it. Every login.", 'Onboarding', 'P2'],
  [S.tw, "That onboarding checklist in @ledgerly is haunted. I have dismissed it four times.", 'Onboarding', 'P2'],
  [S.mail, "New team members get the full onboarding tour even though the workspace is already set up. The tour tells them to 'connect Stripe' which is already connected. Confusing.", 'Onboarding', 'P2'],
  [S.survey, "I didn't understand what a 'billing anchor' is during setup. No explanation, no tooltip.", 'Onboarding', 'P3'],
  [S.mail, "The trial ended without any warning email. I logged in to a paywall with three invoices due that day. A 3-day and 1-day heads-up would be standard.", 'Onboarding', 'P1'],
  [S.app, "1 star. Trial expired mid-month with zero warning and locked me out of my own invoices. Had to pay to get my data.", 'Onboarding', 'P1'],
  [S.survey, "Company logo upload during setup accepts PNG only. My logo is an SVG.", 'Onboarding', 'P3'],
  [S.mail, "Logo upload rejected my SVG and my 2MB PNG. The limit is not stated anywhere. Please say what you accept.", 'Onboarding', 'P3'],
  [S.sales, "Demo went well but the prospect said the first-run experience 'assumes you already know invoicing software'. They are a solo consultant.", 'Onboarding', 'P2'],
  [S.survey, "Verification email took 25 minutes to arrive. I had signed up twice by then.", 'Onboarding', 'P2'],
  [S.mail, "Signed up with Google, then tried to sign in with email and password and it created a second account. Now I have two workspaces and cannot merge them.", 'Onboarding', 'P1'],
  [S.tw, "Made two accounts by accident on @ledgerly (Google vs email). No way to merge. Support says 'pick one'.", 'Onboarding', 'P1'],
  [S.survey, "Timezone defaulted to UTC. All my invoice dates were a day off until I noticed.", 'Onboarding', 'P2'],
  [S.mail, "The default timezone is UTC and it is buried in settings. Every invoice we sent in the first week has the wrong date on it for our Sydney office.", 'Onboarding', 'P2'],
  [S.app, "3 stars. It would help a lot to have a sample invoice I can send to myself before I send a real one to a client.", 'Onboarding', 'P3'],
  [S.survey, "The 'skip for now' link on the tax setup step is grey on grey. I did not see it and gave up.", 'Onboarding', 'P2'],
  [S.mail, "I finished setup and landed on an empty dashboard with no call to action. I had to find 'New invoice' in a menu.", 'Onboarding', 'P2'],

  // ─── Performance ────────────────────────────────────────────────────────
  [S.mail, "The invoice list takes 12 to 15 seconds to load since last week. We have around 9,000 invoices. It used to be instant.", 'Performance', 'P1', true],
  [S.tw, "@ledgerly invoice list is crawling today. 10+ seconds. Anyone else?", 'Performance', 'P1'],
  [S.survey, "Invoice list is really slow now (about 10s). Was fine a month ago.", 'Performance', 'P1'],
  [S.mail, "Generating the monthly aging report times out for us every time. We get a spinner for two minutes and then 'something went wrong'. This is our most important report.", 'Performance', 'P0', true],
  [S.mail, "Aging report never finishes. We have 11k invoices. Timed out three times this morning.", 'Performance', 'P0'],
  [S.app, "2 stars. The app freezes for a few seconds every time I open a customer with a long payment history.", 'Performance', 'P2'],
  [S.survey, "Customer pages with 200+ invoices lock up the browser tab for 3-4 seconds.", 'Performance', 'P2'],
  [S.mail, "PDF generation for a 40-line invoice takes almost 20 seconds. Our clients see a blank tab and think it broke.", 'Performance', 'P1'],
  [S.tw, "Why does a PDF invoice take 20 seconds to render on @ledgerly? It's a table.", 'Performance', 'P1'],
  [S.survey, "Search is laggy. Each keystroke takes half a second to register.", 'Performance', 'P2'],
  [S.mail, "Typing in the global search box is painful. Letters appear with a delay and the results flicker. Chrome on a fast Mac.", 'Performance', 'P2'],
  [S.mail, "Bulk-sending 300 invoices at month end took 45 minutes and we could not use the app during that time. A background job with a progress indicator would be so much better.", 'Performance', 'P1'],
  [S.sales, "Prospect sends 2,000 invoices on the 1st of every month. Asked how long a bulk send takes. I did not have a good answer.", 'Performance', 'P1'],
  [S.survey, "Dashboard charts take longer to load than the rest of the page. They pop in 5 seconds later and shift everything down.", 'Performance', 'P2'],
  [S.mail, "The dashboard layout jumps when the revenue chart loads. I have clicked the wrong button twice because of it.", 'Performance', 'P2'],
  [S.app, "3 stars. Works, but the whole app feels heavier than six months ago. Every page has a little wait.", 'Performance', 'P2'],
  [S.mail, "Exporting invoices to CSV for the year returns a 502 error. Smaller ranges (a month) work. We need the full year for our auditors.", 'Performance', 'P1'],
  [S.survey, "Yearly CSV export errors out (502). Monthly works.", 'Performance', 'P1'],
  [S.tw, "Third time this week the @ledgerly status page says all good while the app is unusable for us. Please be honest on the status page.", 'Performance', 'P1'],
  [S.mail, "We had two outages last week of about 20 minutes each. Neither appeared on your status page. We were sending invoices during both.", 'Performance', 'P1'],
  [S.survey, "Memory use of the tab grows until Chrome kills it if I leave Ledgerly open all day.", 'Performance', 'P2'],
  [S.mail, "Leaving the app open overnight, the tab reaches 2GB of memory. Something is leaking. Refreshing fixes it temporarily.", 'Performance', 'P2'],
  [S.survey, "Autosave on the invoice editor lags 2-3 seconds behind my typing and sometimes reverts a line.", 'Performance', 'P1'],
  [S.mail, "The invoice editor lost a line item I had just typed. Autosave seemed to apply an older state on top of my newer one. Happened twice this week.", 'Performance', 'P1'],
  [S.app, "4 stars. Fast enough on desktop but please cache the customer list, it reloads from scratch every time I go back.", 'Performance', 'P3'],
  [S.survey, "Every navigation refetches everything. No caching at all it seems.", 'Performance', 'P3'],
  [S.mail, "Webhook deliveries to our endpoint are arriving 10 to 30 minutes late during business hours. Overnight they are instant. Are you queueing?", 'Performance', 'P1'],
  [S.sales, "Prospect's engineering team asked for p95 latency numbers on the API. We do not publish any. They said their current vendor does.", 'Performance', 'P3'],
  [S.tw, "Uploading a 3MB receipt image to @ledgerly takes a minute. It is 2026.", 'Performance', 'P2'],
  [S.mail, "Attachments over 2MB take a very long time to upload and sometimes fail with no error. Our expense receipts are photos from phones, so they are all above that.", 'Performance', 'P2'],
  [S.survey, "First load after login is 8+ seconds on a good connection.", 'Performance', 'P2'],
  [S.mail, "Cold start of the app after login is around 8 seconds for me. Most of it seems to be a giant JavaScript download.", 'Performance', 'P2'],

  // ─── Mobile ─────────────────────────────────────────────────────────────
  [S.app, "1 star. The iOS app crashes on launch since the last update. iPhone 15, iOS 26. Reinstalled twice.", 'Mobile', 'P0', true],
  [S.app, "Crashes immediately on open after updating. iPhone 14 Pro. Please fix.", 'Mobile', 'P0'],
  [S.tw, "@ledgerly iOS app won't open after today's update. Crash on splash screen. Anyone?", 'Mobile', 'P0'],
  [S.mail, "iOS app crashes at launch since version 4.2. I am on the road all week and cannot check whether clients have paid.", 'Mobile', 'P0'],
  [S.app, "3 stars. You cannot create an invoice from the mobile app, only view them. Half the reason I have a phone app is to invoice on site.", 'Mobile', 'P1', true],
  [S.survey, "Mobile app is read-only. Need to create and send invoices from my phone.", 'Mobile', 'P1'],
  [S.sales, "Field services prospect: technicians need to invoice from the van. Our mobile app can't create invoices. Deal is on hold.", 'Mobile', 'P1'],
  [S.app, "2 stars. Android app does not support fingerprint login. I have to type a 20-character password every time.", 'Mobile', 'P2'],
  [S.survey, "Biometric login on Android please.", 'Mobile', 'P2'],
  [S.app, "4 stars. Push notifications for payments received would be great. Right now I check manually.", 'Mobile', 'P2'],
  [S.tw, "Would pay extra for a push notification when an invoice gets paid in @ledgerly. Dopamine as a service.", 'Mobile', 'P2'],
  [S.mail, "The mobile web version does not let me scroll the invoice table horizontally. The amount column is cut off and there is no way to see it.", 'Mobile', 'P1'],
  [S.survey, "On my phone the invoice table is cut off on the right. Cannot see totals.", 'Mobile', 'P1'],
  [S.app, "2 stars. Dark mode on the iOS app makes the invoice preview unreadable: black text on dark grey.", 'Mobile', 'P2'],
  [S.mail, "Dark mode: the invoice preview in the iPhone app has near-black text on a dark background. I have to switch to light mode to read it.", 'Mobile', 'P2'],
  [S.app, "3 stars. Camera receipt capture only works in portrait. Landscape receipts come out rotated and tiny.", 'Mobile', 'P3'],
  [S.survey, "Receipt scan crops the bottom of long receipts.", 'Mobile', 'P2'],
  [S.mail, "The receipt scanner on Android cuts off the last few lines of long receipts, which is where the total is. I end up typing the amount by hand anyway.", 'Mobile', 'P2'],
  [S.app, "1 star. Logged out every single time I switch apps. Session lasts about 30 seconds in the background.", 'Mobile', 'P1'],
  [S.mail, "The iOS app logs me out whenever it goes to the background for more than a minute. Very frustrating when copying details from email.", 'Mobile', 'P1'],
  [S.tw, "@ledgerly mobile logs me out if I so much as glance at another app.", 'Mobile', 'P1'],
  [S.app, "5 stars but the widget shows revenue in USD even though my account is in GBP.", 'Mobile', 'P2'],
  [S.survey, "iPad app is just the phone app stretched. Please use the space.", 'Mobile', 'P3'],
  [S.mail, "On iPad the app runs in a phone-sized layout with huge empty margins. A two-pane layout would be far more useful for reviewing invoices.", 'Mobile', 'P3'],
  [S.app, "3 stars. Notifications for overdue invoices arrive at 4am my time.", 'Mobile', 'P3'],
  [S.survey, "Offline mode: I lose everything I was typing if the connection drops in the app.", 'Mobile', 'P2'],
  [S.mail, "Lost a whole invoice draft on the mobile app when the train went through a tunnel. Drafts should persist offline.", 'Mobile', 'P2'],
  [S.app, "2 stars. Tapping a customer's phone number in the app copies it instead of calling.", 'Mobile', 'P3'],
  [S.survey, "Can't attach a file from Files app on iOS, only from Photos.", 'Mobile', 'P2'],
  [S.mail, "The attach button in the iOS app only opens the photo library. Our receipts are PDFs in the Files app. Please add a document picker.", 'Mobile', 'P2'],

  // ─── Integrations ───────────────────────────────────────────────────────
  [S.mail, "The QuickBooks sync has been creating duplicate customers every night since Aug 25. We now have 300 duplicated contacts in QBO and our accountant is threatening to disconnect it.", 'Integrations', 'P0', true],
  [S.tw, "Heads up: @ledgerly QuickBooks sync duplicating customers nightly. Check your QBO.", 'Integrations', 'P0'],
  [S.mail, "Every QuickBooks sync creates a new copy of each customer instead of matching the existing one. Started about a week ago.", 'Integrations', 'P0'],
  [S.mail, "Stripe webhook signature verification fails intermittently on your side, so some payments never mark the invoice as paid. Our clients then get reminders for invoices they already paid.", 'Integrations', 'P0', true],
  [S.survey, "Paid invoices sometimes stay 'unpaid' after Stripe payment. Clients get wrongly reminded.", 'Integrations', 'P0'],
  [S.mail, "Xero integration: tax codes are not mapped, every synced invoice lands in Xero with 'no tax' and we have to fix each one by hand.", 'Integrations', 'P1'],
  [S.sales, "Prospect uses Xero. Asked whether tax codes sync. They do not. Prospect's bookkeeper said that is a dealbreaker.", 'Integrations', 'P1'],
  [S.survey, "Zapier trigger 'invoice paid' fires twice for the same invoice.", 'Integrations', 'P1'],
  [S.mail, "Our Zapier zap on 'Invoice paid' runs twice per payment, so our Slack channel gets two messages and our Google Sheet gets two rows. Idempotency please.", 'Integrations', 'P1'],
  [S.mail, "The API rate limit is 60 requests per minute, which is far too low to sync our 20k customers nightly. It takes over five hours.", 'Integrations', 'P1'],
  [S.sales, "Engineering lead at prospect asked about API rate limits. When I said 60/min he laughed. They need bulk endpoints.", 'Integrations', 'P1'],
  [S.tw, "Any chance of a Notion integration for @ledgerly? Even just an embed of the unpaid list.", 'Integrations', 'P3'],
  [S.survey, "HubSpot: deals closed-won should create a customer + subscription automatically.", 'Integrations', 'P2'],
  [S.mail, "We would love a HubSpot integration. When a deal closes we currently copy the contact details into Ledgerly by hand, which is error-prone.", 'Integrations', 'P2'],
  [S.mail, "Slack notifications only go to one channel for the whole workspace. We want overdue alerts in #finance and payment alerts in #sales.", 'Integrations', 'P2'],
  [S.survey, "Per-event Slack channels please.", 'Integrations', 'P2'],
  [S.mail, "The API returns amounts as floats. We have seen 19.999999 for what should be 20.00. Please use integers in minor units or strings.", 'Integrations', 'P1'],
  [S.mail, "Google Sheets export is a one-time CSV, not a live connection. The Sheets 'integration' in your marketing is misleading.", 'Integrations', 'P2'],
  [S.tw, "@ledgerly markets a Google Sheets integration. It is a CSV download button.", 'Integrations', 'P2'],
  [S.survey, "OAuth token for Stripe expires every 30 days and nobody is notified. Sync just stops.", 'Integrations', 'P1'],
  [S.mail, "Our Stripe connection silently disconnected. No email, no banner. We noticed after a week when no invoices had been marked as paid.", 'Integrations', 'P1'],
  [S.mail, "Webhook payloads do not include the customer's external ID that we set via the API, only your internal ID. We have to make a second call for every event.", 'Integrations', 'P2'],
  [S.sales, "Prospect wants SSO via Okta. We only have Google SSO. They cannot use us without SAML.", 'Integrations', 'P1'],
  [S.mail, "Do you support SAML SSO? Our IT policy requires it for any finance tool. Google-only sign-in will not pass our security review.", 'Integrations', 'P1'],
  [S.survey, "Salesforce connector only syncs one direction (Ledgerly to SF). Need the reverse.", 'Integrations', 'P2'],
  [S.mail, "The Salesforce integration pushes invoices to Salesforce but does not pull account changes back. When a client changes their billing address in SF we have to re-enter it here.", 'Integrations', 'P2'],
  [S.tw, "Is there an @ledgerly API endpoint to void an invoice? Can't find one in the docs.", 'Integrations', 'P2'],
  [S.mail, "I cannot find an API method to void an invoice. The UI has the button. Is it just missing from the API?", 'Integrations', 'P2'],
  [S.survey, "Webhooks have no retry. If our server is down for a minute we lose events forever.", 'Integrations', 'P1'],
  [S.mail, "Webhook events are not retried on failure. We had a 90-second deploy window and lost 14 payment events. Please retry with backoff like every other provider.", 'Integrations', 'P1'],

  // ─── Docs ───────────────────────────────────────────────────────────────
  [S.mail, "The API docs still reference the v1 endpoints that were removed in June. I spent a morning integrating against an endpoint that returns 410 Gone.", 'Docs', 'P1', true],
  [S.tw, "@ledgerly API docs describe endpoints that no longer exist. v1 was removed in June, docs still say v1.", 'Docs', 'P1'],
  [S.survey, "Docs code samples are in Ruby only. We are a Node shop.", 'Docs', 'P2'],
  [S.mail, "All the code examples in your docs are Ruby. Could you at least add JavaScript and Python? Most of your customers are not Rails shops.", 'Docs', 'P2'],
  [S.mail, "There is no documentation at all on how proration is calculated. Our customers ask, and we cannot explain it. A worked example would go a long way.", 'Docs', 'P2'],
  [S.survey, "How is proration calculated? Not in the docs. Support did not know either.", 'Docs', 'P2'],
  [S.sales, "Prospect's developer said the webhook docs do not list the payload for 'subscription.updated'. He had to reverse-engineer it from a test event.", 'Docs', 'P2'],
  [S.mail, "Webhook payload reference is missing half the events. 'subscription.updated' and 'credit_note.created' are not documented at all.", 'Docs', 'P2'],
  [S.tw, "The @ledgerly help center search returns nothing for 'credit note'. It is a feature you have.", 'Docs', 'P2'],
  [S.survey, "Help center search is useless. Searched 'VAT' and got an article about logo upload.", 'Docs', 'P2'],
  [S.mail, "Your tax documentation says EU reverse charge is applied automatically, but it is only applied if the customer's VAT number has been validated, which is not mentioned anywhere. Cost us a reissued invoice.", 'Docs', 'P1'],
  [S.app, "4 stars. The in-app help links open the generic help center home page, not the article for the screen I am on.", 'Docs', 'P3'],
  [S.survey, "Contextual help links all go to the same landing page.", 'Docs', 'P3'],
  [S.mail, "The OpenAPI spec you publish does not validate. Our codegen tool rejects it because of duplicated operationIds.", 'Docs', 'P1'],
  [S.mail, "Your OpenAPI file has duplicate operationId values, so openapi-generator refuses to build a client. Took me a while to figure out it was your spec and not my setup.", 'Docs', 'P1'],
  [S.survey, "Changelog has not been updated since May. Things changed a lot since then.", 'Docs', 'P2'],
  [S.tw, "Is the @ledgerly changelog abandoned? Last entry May. Product clearly shipped stuff since.", 'Docs', 'P2'],
  [S.mail, "Docs are English only. Our finance team in Paris would appreciate a French version of at least the getting started guide.", 'Docs', 'P3'],
  [S.sales, "Prospect asked for a security whitepaper / SOC 2 report. We have SOC 2 but there is no page mentioning it. They assumed we did not have it.", 'Docs', 'P2'],
  [S.mail, "Where is your SOC 2 report? Our vendor review requires it and I cannot find any security page on your site.", 'Docs', 'P2'],
  [S.survey, "Keyboard shortcuts exist (I found ? by accident) but are documented nowhere.", 'Docs', 'P3'],
  [S.mail, "The 'Getting started' guide screenshots are from the old UI. Buttons are in different places now, which confused two of my new hires.", 'Docs', 'P2'],
  [S.survey, "Screenshots in the docs are outdated (old navigation).", 'Docs', 'P2'],
  [S.mail, "The API reference does not say which fields are required when creating an invoice. Trial and error until the 400 errors stopped.", 'Docs', 'P2'],
  [S.tw, "Would love a Postman collection for the @ledgerly API. Docs alone are not enough to get started fast.", 'Docs', 'P3'],
];

if (R.length !== 187) { console.error(`expected 187 rows, got ${R.length}`); process.exit(1); }

// Deterministic PRNG so the dataset is reproducible.
let seed = 20260901;
const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

// Shuffle so areas are interleaved like a real export, then assign dates.
const idx = R.map((_, i) => i);
for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }

const start = Date.UTC(2026, 7, 18); // Aug 18, 2026
const span = 15; // days → Sep 1
const rows = idx.map((ri, i) => {
  const [source, text, area, severity, pretagged] = R[ri];
  const day = Math.floor((i / idx.length) * span);
  const received = new Date(start + day * 86400000).toISOString().slice(0, 10);
  const id = `fb_${String(i + 1).padStart(3, '0')}`;
  return pretagged
    ? { id, source, received, text, area, severity, status: 'Triaged', notes: '' }
    : { id, source, received, text, area: null, severity: null, status: 'New', notes: '' };
});

// Rows are sorted by received date, newest last — like an export.
writeFileSync(new URL('../src/data/feedback.json', import.meta.url), JSON.stringify(rows, null, 2) + '\n');
const untagged = rows.filter((r) => !r.area).length;
console.log(`wrote ${rows.length} rows, ${untagged} untagged, ${rows.length - untagged} pre-tagged`);
