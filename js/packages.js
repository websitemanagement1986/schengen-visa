const PACKAGES = [
  {
    id: 'visa-assist',
    name: 'Visa file assistance',
    price: 2999,
    duration: '4 working days',
    featured: false,
    tasks: ['Document checklist review', 'Cover letter draft', 'Application form guidance', 'VAC appointment guidance', 'Interview preparation tips'],
  },
  {
    id: 'itinerary',
    name: 'Itinerary planning',
    price: 999,
    duration: '3 working days',
    featured: false,
    tasks: ['Day-by-day Europe route', 'Best cities for your dates', 'Local transport tips', 'Budget-aware suggestions'],
  },
  {
    id: 'tickets',
    name: 'Ticket booking guidance',
    price: 499,
    duration: '2 working days',
    featured: false,
    tasks: ['Flight option shortlist', 'Entry/exit Schengen routing', 'Baggage & fare rules explained', 'Booking steps by email'],
  },
  {
    id: 'stay',
    name: 'Accommodation guidance',
    price: 499,
    duration: '2 working days',
    featured: false,
    tasks: ['Hotel/Airbnb shortlist', 'Area safety & connectivity', 'Visa-proof booking format', 'Cancellation policy notes'],
  },
  {
    id: 'bundle',
    name: 'Complete Europe bundle',
    price: 3999,
    duration: '4 working days',
    featured: true,
    tasks: ['All visa file assistance', 'Custom itinerary', 'Flight guidance', 'Stay guidance', 'Single point of contact'],
  },
];

function getPackage(id) {
  return PACKAGES.find((p) => p.id === id);
}

function formatPrice(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}
