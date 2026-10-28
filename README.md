# SchengenEase — Schengen visa & Europe travel assistance

Independent consultancy site for Schengen visa file help, Europe itineraries, and flight/accommodation guidance. Built with Node.js and Express (same pattern as [Fomino](https://github.com/websitemanagement1986/fomino)).

## Features

- Visa information, checklist, and India jurisdiction picker
- Assisted forms: itinerary, flights, accommodation, visa enquiry
- Consultancy packages with checkout (PayMate UPI or pay-later request)
- Email notifications via Resend (optional)

## Local development

```bash
cd C:\Repositiries\schengen-visa
npm install
cp .env.example .env   # add PayMate & Resend keys
npm start
```

Open http://localhost:3000

## Environment variables

| Variable | Purpose |
|----------|---------|
| `PAYMATE_*` | PayMate CollectPayments (optional) |
| `SITE_URL` | Public URL for payment return links |
| `RESEND_API_KEY` | Transactional email |
| `FROM_EMAIL` | Sender (default: hello@schengenease.in) |
| `ADMIN_EMAIL` | Enquiry & order notifications |
| `PORT` | Server port (default: 3000) |

## Hostinger deployment

1. Connect GitHub repo `websitemanagement1986/schengen-visa`
2. Node.js app, Express preset, `npm start`
3. Set environment variables in Hostinger panel
4. Point your domain to the app

## Contact

- **Brand:** SchengenEase
- **Email:** hello@schengenease.in
- **Phone:** +91 00000 00000 (placeholder — update in `js/config.js`)
- **Address:** Greater Noida, India

## Disclaimer

SchengenEase is not affiliated with any government or embassy. Visa decisions are made solely by consular authorities.
