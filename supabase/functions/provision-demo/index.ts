import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRODUCTION_URL = "https://propera.cc";

// Enhanced activity definitions with rich content
const DEMO_ACTIVITIES = [
  { 
    name: "Sunrise Yoga", 
    category: "SPA", 
    description: "Greet the day with a soul-nourishing yoga session as the first golden rays paint the ocean. Our certified instructor guides you through gentle flows on the pristine beach, surrounded by the soothing sounds of waves and tropical birds.", 
    short_description: "Beachfront sunrise yoga session",
    full_description: "Begin your morning in paradise with our signature Sunrise Yoga experience. As the sky transforms from deep purple to brilliant orange, find your center on our pristine white sand beach. Our certified yoga instructor leads a 60-minute session suitable for all levels, combining gentle Vinyasa flows with mindful meditation. The session concludes with a peaceful Savasana as the sun rises fully above the horizon. Fresh coconut water and tropical fruit are served afterward.",
    highlights: JSON.stringify(["Beachfront setting with panoramic ocean views", "All levels welcome - modifications provided", "Fresh coconut water & fruit included", "Complimentary yoga mat & towel"]),
    includes: "Yoga mat, towel, fresh coconut water, tropical fruit platter",
    health_and_safety_notes: "Arrive 10 minutes early. Inform instructor of any injuries. Stay hydrated.",
    faq: JSON.stringify([{q: "Do I need yoga experience?", a: "No, our sessions welcome all levels from complete beginners to advanced practitioners."}]),
    duration_minutes: 60, 
    default_max_capacity: 15, 
    default_price_per_person: 35, 
    guest_can_book: true, 
    guest_cutoff_hours: 2, 
    requires_approval: false, 
    difficulty_level: "EASY", 
    image_url: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1024&h=576&fit=crop" 
  },
  { 
    name: "Deep Tissue Massage", 
    category: "SPA", 
    description: "Melt away tension in our overwater spa pavilion with a therapeutic deep tissue massage. Expert therapists use traditional techniques combined with aromatic local oils to release muscle knots and restore your body's natural balance.", 
    short_description: "60-minute therapeutic massage",
    full_description: "Surrender to complete relaxation in our stunning overwater spa pavilion, where floor-to-ceiling windows frame endless ocean views. Our skilled therapists begin with a consultation to understand your needs, then use a combination of deep tissue techniques, pressure point therapy, and long flowing strokes to release chronic muscle tension. Choose from our signature coconut oil, calming lavender, or invigorating lemongrass blends. The treatment includes a warm compress finish and herbal tea service.",
    highlights: JSON.stringify(["Private overwater pavilion with glass floor panels", "Choice of aromatherapy oils", "Targets deep muscle tension & stress", "Includes herbal tea & relaxation time"]),
    includes: "60-min massage, choice of oils, warm compress, herbal tea, robe & slippers",
    health_and_safety_notes: "Not recommended during first trimester pregnancy. Inform therapist of any medical conditions.",
    faq: JSON.stringify([{q: "What pressure levels are available?", a: "Our therapists customize pressure from medium to firm based on your preference and needs."}]),
    duration_minutes: 60, 
    default_max_capacity: 2, 
    default_price_per_person: 120, 
    guest_can_book: true, 
    guest_cutoff_hours: 4, 
    requires_approval: false, 
    difficulty_level: "EASY", 
    image_url: "https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=1024&h=576&fit=crop" 
  },
  { 
    name: "Couples Spa Ritual", 
    category: "SPA", 
    description: "Share an unforgettable wellness journey with your partner in our exclusive couples suite. This 2-hour ritual combines body scrub, massage, and bath ceremony with champagne and ocean views for the ultimate romantic escape.", 
    short_description: "2-hour couples spa experience",
    full_description: "Create lasting memories in our secluded couples pavilion overlooking the crystal lagoon. Your journey begins with a detoxifying coconut and sea salt body scrub, followed by a synchronized aromatherapy massage performed by two expert therapists. The experience culminates with a private flower-petal bath infused with essential oils, accompanied by champagne and chocolate truffles. The entire suite is yours for an additional 30 minutes of relaxation.",
    highlights: JSON.stringify(["Private couples suite with infinity views", "Body scrub + massage + flower bath", "Champagne & chocolate truffles", "Extended relaxation time included"]),
    includes: "Body scrub, 60-min massage, flower bath, champagne, chocolates, extended suite access",
    health_and_safety_notes: "Contains nut-based products. Advise of allergies during booking.",
    duration_minutes: 150, 
    default_max_capacity: 2, 
    default_price_per_person: 280, 
    guest_can_book: true, 
    guest_cutoff_hours: 24, 
    requires_approval: false, 
    difficulty_level: "EASY", 
    image_url: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1024&h=576&fit=crop" 
  },
  { 
    name: "House Reef Snorkel", 
    category: "WATERSPORT", 
    description: "Discover an underwater wonderland just steps from shore. Our pristine house reef hosts over 200 species of tropical fish, graceful sea turtles, and stunning coral formations. Expert marine biologists guide you through this natural aquarium.", 
    short_description: "Guided snorkel on pristine house reef",
    full_description: "Step off our jetty and into a kaleidoscope of marine life. Our resident marine biologist leads small groups along the reef, identifying species and explaining the delicate coral ecosystem. Witness parrotfish, butterflyfish, and if you're lucky, our resident hawksbill turtles. Premium snorkel equipment is provided, and our team ensures your safety throughout. Perfect for first-timers and experienced snorkelers alike.",
    highlights: JSON.stringify(["200+ fish species & regular turtle sightings", "Led by resident marine biologist", "Premium equipment included", "Underwater camera rental available"]),
    includes: "Premium mask, snorkel & fins, reef-safe sunscreen, bottled water, fish ID card",
    health_and_safety_notes: "Basic swimming ability required. Life jackets available. Reef-safe sunscreen only.",
    faq: JSON.stringify([{q: "Do I need to be a strong swimmer?", a: "Basic swimming ability is sufficient. Life jackets are available for extra confidence."}]),
    duration_minutes: 90, 
    default_max_capacity: 8, 
    default_price_per_person: 55, 
    guest_can_book: true, 
    guest_cutoff_hours: 2, 
    requires_approval: false, 
    difficulty_level: "EASY", 
    is_swimming_required: true,
    image_url: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1024&h=576&fit=crop" 
  },
  { 
    name: "Kayak Adventure", 
    category: "WATERSPORT", 
    description: "Paddle through crystal-clear lagoon waters at your own pace. Explore hidden sandbars, spot baby reef sharks in the shallows, and discover secret beaches inaccessible by foot. Single and tandem kayaks available.", 
    short_description: "Self-guided lagoon kayaking",
    full_description: "Collect your kayak from our water sports center and set off to explore our stunning lagoon at your leisure. Our team provides a waterproof map highlighting the best spots - from shallow areas teeming with baby blacktip reef sharks to secluded sandbars perfect for a swimming break. Both single and tandem kayaks are available, along with dry bags for your valuables and GoPro mounts for capturing your adventure.",
    highlights: JSON.stringify(["Explore at your own pace", "Spot baby reef sharks & stingrays", "Access hidden sandbars", "Waterproof map & dry bag included"]),
    includes: "Kayak, paddle, life jacket, waterproof map, dry bag, bottled water",
    health_and_safety_notes: "Wear reef shoes. Apply sunscreen before departure. Stay within marked lagoon area.",
    duration_minutes: 60, 
    default_max_capacity: 10, 
    default_price_per_person: 45, 
    guest_can_book: true, 
    guest_cutoff_hours: 1, 
    requires_approval: false, 
    difficulty_level: "EASY", 
    image_url: "https://images.unsplash.com/photo-1572111065620-89d50c5e75f5?w=1024&h=576&fit=crop" 
  },
  { 
    name: "Paddleboard Lesson", 
    category: "WATERSPORT", 
    description: "Master the art of stand-up paddleboarding in our calm turquoise lagoon. Perfect for beginners, this lesson covers technique, balance, and water safety, leaving you confident to explore independently.", 
    short_description: "SUP beginner lesson",
    full_description: "Learn the increasingly popular sport of stand-up paddleboarding in ideal conditions. Our certified instructor starts with beach-based technique training before guiding you into our sheltered lagoon. By the session's end, you'll be confidently paddling, turning, and even trying some yoga poses on the board! Complimentary board rental for the rest of the day included.",
    highlights: JSON.stringify(["Calm lagoon - perfect learning conditions", "Small groups (max 6 people)", "Complimentary board rental post-lesson", "Waterproof phone pouch included"]),
    includes: "Paddleboard, paddle, instructor, complimentary rental post-lesson, phone pouch",
    health_and_safety_notes: "Swimming ability required. Wear quick-dry clothing. Sunscreen essential.",
    duration_minutes: 75, 
    default_max_capacity: 6, 
    default_price_per_person: 65, 
    guest_can_book: true, 
    guest_cutoff_hours: 2, 
    requires_approval: false, 
    difficulty_level: "EASY", 
    is_swimming_required: true,
    image_url: "https://images.unsplash.com/photo-1526188717906-ab4a2f949f47?w=1024&h=576&fit=crop" 
  },
  { 
    name: "Night Snorkel", 
    category: "WATERSPORT", 
    description: "Witness the reef's nocturnal transformation on this magical after-dark adventure. Armed with underwater torches, discover hunting octopuses, sleeping parrotfish in mucus cocoons, and bioluminescent plankton.", 
    short_description: "Guided underwater torch adventure",
    full_description: "As darkness falls, the reef comes alive with a completely different cast of characters. Join our marine guide for a fascinating twilight snorkel using powerful underwater torches. Watch hunting moray eels emerge from their hiding spots, see parrotfish wrapped in protective mucus bubbles, and marvel as your fins disturb clouds of bioluminescent plankton. This unforgettable experience reveals a hidden world few ever witness.",
    highlights: JSON.stringify(["See nocturnal marine life", "Professional underwater torches provided", "Bioluminescent plankton", "Maximum 6 guests for intimate experience"]),
    includes: "Premium snorkel gear, underwater torch, wetsuit (optional), hot chocolate after",
    health_and_safety_notes: "Good swimming ability required. Must be comfortable in dark water.",
    duration_minutes: 75, 
    default_max_capacity: 6, 
    default_price_per_person: 85, 
    guest_can_book: true, 
    guest_cutoff_hours: 4, 
    requires_approval: false, 
    difficulty_level: "MODERATE", 
    is_swimming_required: true,
    image_url: "https://images.unsplash.com/photo-1682687982501-1e58ab814714?w=1024&h=576&fit=crop" 
  },
  { 
    name: "Intro Dive", 
    category: "DIVE", 
    description: "Take your first breath underwater and discover the magic of scuba diving. No experience needed - our PADI instructors provide comprehensive training and guide you through every moment of this life-changing experience.", 
    short_description: "First-time scuba experience",
    full_description: "Your underwater journey begins in our dive center with theory and pool training. Learn essential skills including breathing, equalizing, and hand signals in the comfort of shallow water. Once confident, transfer to our house reef for a guided dive to 10-12 meters alongside your instructor. Encounter colorful fish, sea turtles, and stunning coral as you take your first underwater breaths. Photos and video of your experience are available.",
    highlights: JSON.stringify(["No prior experience needed", "Pool training + open water dive", "Maximum 2 guests per instructor", "Underwater photos available"]),
    includes: "Full scuba equipment, pool training, 1 ocean dive, instructor, dive log book",
    health_and_safety_notes: "Medical questionnaire required. Not suitable for those with respiratory conditions. No flying for 24 hours after diving.",
    faq: JSON.stringify([{q: "Is diving safe for beginners?", a: "Absolutely! With proper training and our 1:2 instructor ratio, you're in expert hands throughout."}]),
    duration_minutes: 180, 
    default_max_capacity: 4, 
    default_price_per_person: 175, 
    guest_can_book: true, 
    guest_cutoff_hours: 24, 
    requires_approval: true, 
    difficulty_level: "EASY", 
    is_swimming_required: true,
    image_url: "https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?w=1024&h=576&fit=crop" 
  },
  { 
    name: "Advanced Reef Dive", 
    category: "DIVE", 
    description: "Certified divers explore world-class sites featuring manta rays, reef sharks, and vibrant coral walls. Our expert dive masters know where the big stuff hides - join us for an unforgettable two-tank adventure.", 
    short_description: "2-tank dive for certified divers",
    full_description: "Board our fully-equipped dive dhoni for a morning of spectacular diving. Your dive master selects sites based on current conditions and marine life activity - options include the famous Manta Point, Shark Reef, and Turtle Garden. Each dive explores different ecosystems from coral-covered thilas to dramatic channel drifts. Between dives, enjoy fresh fruit and refreshments while discussing what you've seen. Nitrox available for qualified divers.",
    highlights: JSON.stringify(["Manta rays, reef sharks & turtles", "2 dives at premium sites", "Nitrox available", "Refreshments between dives"]),
    includes: "Full equipment, 2 dives, boat transfer, dive guide, refreshments, Nitrox (if certified)",
    health_and_safety_notes: "Open Water certification minimum. Dive computer mandatory. Log book required.",
    faq: JSON.stringify([{q: "What certification do I need?", a: "PADI Open Water or equivalent. Advanced Open Water recommended but not required."}]),
    duration_minutes: 240, 
    default_max_capacity: 8, 
    default_price_per_person: 220, 
    guest_can_book: true, 
    guest_cutoff_hours: 12, 
    requires_approval: true, 
    difficulty_level: "ADVANCED", 
    is_swimming_required: true,
    image_url: "https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=1024&h=576&fit=crop" 
  },
  { 
    name: "Sunset Dolphin Cruise", 
    category: "EXCURSION", 
    description: "Set sail at golden hour aboard a traditional Maldivian dhoni as pods of spinner dolphins leap and play around the boat. Toast the spectacular sunset with champagne while dolphins perform their acrobatic displays.", 
    short_description: "Champagne sunset & dolphin watching",
    full_description: "Board our traditional wooden dhoni as the late afternoon light turns golden. Cruise to known dolphin gathering spots where pods of up to 100 spinner dolphins often swim alongside boats. Watch as they leap, spin, and play in the bow wave while the sun sinks toward the horizon. Sip champagne and enjoy chef-prepared canapés as the sky transforms through oranges, pinks, and purples. We guarantee dolphin sightings or offer a free rebooking.",
    highlights: JSON.stringify(["Guaranteed dolphin sighting*", "Champagne & gourmet canapés", "Traditional dhoni experience", "Prime photography opportunity"]),
    includes: "Champagne, canapés, soft drinks, sunset photography tips, cozy blankets",
    health_and_safety_notes: "Motion sickness tablets recommended for sensitive guests. Life jackets available.",
    faq: JSON.stringify([{q: "What if we don't see dolphins?", a: "We maintain a 98% sighting rate. If dolphins aren't spotted, you receive a free rebooking."}]),
    duration_minutes: 120, 
    default_max_capacity: 12, 
    default_price_per_person: 95, 
    guest_can_book: true, 
    guest_cutoff_hours: 4, 
    requires_approval: false, 
    difficulty_level: "EASY", 
    image_url: "https://images.unsplash.com/photo-1570481662006-a3a1374699e8?w=1024&h=576&fit=crop" 
  },
  { 
    name: "Night Fishing", 
    category: "EXCURSION", 
    description: "Experience authentic Maldivian culture on a traditional night fishing trip. Learn line-fishing techniques passed down through generations, and if you're lucky, have your catch prepared by our chefs for the next day's lunch.", 
    short_description: "Traditional Maldivian fishing",
    full_description: "Depart at dusk aboard a traditional dhoni, cruising to productive fishing grounds as stars emerge overhead. Our local crew teaches you the hand-line technique used in the Maldives for centuries. Common catches include red snapper, grouper, and emperor fish. Listen to crew stories, enjoy light refreshments, and experience the peaceful magic of fishing under the stars. Your catch can be cooked to order the following day.",
    highlights: JSON.stringify(["Learn traditional fishing techniques", "Keep your catch - we'll cook it!", "Stargazing opportunity", "Authentic local experience"]),
    includes: "Fishing equipment, bait, refreshments, crew assistance, catch preparation next day",
    health_and_safety_notes: "Can be choppy - motion sickness precautions advised. Warm layer recommended for return.",
    duration_minutes: 180, 
    default_max_capacity: 8, 
    default_price_per_person: 95, 
    guest_can_book: true, 
    guest_cutoff_hours: 6, 
    requires_approval: false, 
    difficulty_level: "EASY", 
    image_url: "https://images.unsplash.com/photo-1545450660-3378a7f3a364?w=1024&h=576&fit=crop" 
  },
  { 
    name: "Sandbank Picnic", 
    category: "EXCURSION", 
    description: "Escape to your own private island for an unforgettable castaway experience. We set up a luxurious picnic on a pristine sandbank accessible only by boat, complete with gourmet lunch, champagne, and snorkeling gear.", 
    short_description: "Private sandbank escape",
    full_description: "Speed by private boat to an uninhabited sandbank where we've prepared your exclusive setup - Bedouin-style shade tent, cushions, and a fully stocked gourmet picnic. Spend hours in complete privacy, swimming in gin-clear waters, snorkeling the surrounding reef, and enjoying lobster, fresh salads, and chilled champagne. Your butler-host remains discreetly nearby to refresh drinks and deliver dessert. The ultimate romantic escape.",
    highlights: JSON.stringify(["Completely private experience", "Gourmet picnic with champagne", "Butler service included", "Snorkel gear provided"]),
    includes: "Private boat transfer, gourmet picnic, champagne, snorkel gear, sun shade, butler service",
    health_and_safety_notes: "Limited shade - high SPF essential. Swimming ability recommended.",
    duration_minutes: 240, 
    default_max_capacity: 4, 
    default_price_per_person: 295, 
    guest_can_book: true, 
    guest_cutoff_hours: 24, 
    requires_approval: false, 
    difficulty_level: "EASY", 
    image_url: "https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=1024&h=576&fit=crop" 
  },
  { 
    name: "Local Island Visit", 
    category: "EXCURSION", 
    description: "Discover authentic Maldivian culture with a guided visit to a nearby inhabited island. Explore colorful streets, meet local artisans, visit a traditional mosque, and shop for handmade souvenirs.", 
    short_description: "Cultural island excursion",
    full_description: "Gain insight into traditional Maldivian life on this half-day cultural excursion. Your English-speaking guide leads you through the village, explaining local customs, architecture, and daily life. Visit a traditional boat-builder, watch lacquer work artisans, and peek inside a coral stone mosque. Enjoy fresh 'hedhika' (local short-eats) at a family-run café and browse stalls selling handwoven mats and coconut crafts. A unique window into island life beyond the resort.",
    highlights: JSON.stringify(["Meet local artisans & craftspeople", "Taste authentic Maldivian snacks", "Visit traditional mosque (modest dress provided)", "Support local community"]),
    includes: "Boat transfer, English-speaking guide, local snacks & drinks, modest attire for mosque",
    health_and_safety_notes: "Modest dress required for mosque visits. Walking shoes recommended. Respect local customs.",
    faq: JSON.stringify([{q: "What should I wear?", a: "Casual clothes are fine. We provide cover-ups for mosque visits. No swimwear please."}]),
    duration_minutes: 180, 
    default_max_capacity: 10, 
    default_price_per_person: 85, 
    guest_can_book: true, 
    guest_cutoff_hours: 4, 
    requires_approval: false, 
    difficulty_level: "EASY", 
    image_url: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=1024&h=576&fit=crop" 
  },
  { 
    name: "Photography Tour", 
    category: "EXCURSION", 
    description: "Capture the Maldives through the lens of a professional photographer. This sunrise or sunset tour takes you to the most photogenic spots on the island, with expert guidance on composition, lighting, and settings.", 
    short_description: "Photo safari with professional",
    full_description: "Join our resident professional photographer for a golden hour expedition to the island's most stunning locations. Whether you're using a smartphone or DSLR, you'll learn practical techniques for capturing breathtaking landscapes, wildlife, and creative portraits. Visit jetty silhouettes, swaying palms, and beach vistas carefully timed for optimal light. Receive personalized tips and tricks, and leave with portfolio-worthy images. Includes basic editing session afterward.",
    highlights: JSON.stringify(["Professional photographer guidance", "Best locations for golden hour", "Camera settings & composition tips", "Basic editing session included"]),
    includes: "Professional photographer guide, 2-hour tour, editing session, location guide map",
    health_and_safety_notes: "Sunrise tours start 30 min before dawn. Bring your own camera/phone.",
    duration_minutes: 120, 
    default_max_capacity: 6, 
    default_price_per_person: 120, 
    guest_can_book: true, 
    guest_cutoff_hours: 12, 
    requires_approval: false, 
    difficulty_level: "EASY", 
    image_url: "https://images.unsplash.com/photo-1500463959177-e0869687df26?w=1024&h=576&fit=crop" 
  },
];

// Activity-specific session time slots
const ACTIVITY_TIME_SLOTS: Record<string, { time: string; label?: string }[]> = {
  // Category defaults
  SPA: [
    { time: "09:00", label: "Morning" },
    { time: "11:00", label: "Late Morning" },
    { time: "14:00", label: "Afternoon" },
    { time: "16:00", label: "Late Afternoon" },
  ],
  DIVE: [
    { time: "07:30", label: "Early Morning" },
    { time: "10:30", label: "Mid Morning" },
    { time: "14:00", label: "Afternoon" },
  ],
  WATERSPORT: [
    { time: "08:00", label: "Morning" },
    { time: "10:30", label: "Late Morning" },
    { time: "14:00", label: "Afternoon" },
    { time: "16:00", label: "Late Afternoon" },
  ],
  EXCURSION: [
    { time: "09:00", label: "Morning" },
    { time: "14:00", label: "Afternoon" },
  ],
  
  // Activity-specific overrides (takes precedence over category)
  "Sunrise Yoga": [{ time: "06:00", label: "Sunrise" }],
  "Night Fishing": [{ time: "17:30", label: "Evening Departure" }],
  "Sunset Dolphin Cruise": [{ time: "17:00", label: "Sunset" }],
  "Night Snorkel": [{ time: "19:30", label: "After Dark" }],
  "Photography Tour": [
    { time: "05:30", label: "Sunrise" },
    { time: "17:00", label: "Sunset" },
  ],
  "Sandbank Picnic": [{ time: "10:00", label: "Morning Departure" }],
  "Couples Spa Ritual": [
    { time: "10:00", label: "Morning" },
    { time: "15:00", label: "Afternoon" },
  ],
  "Advanced Reef Dive": [
    { time: "07:00", label: "Early Morning" },
    { time: "13:30", label: "Afternoon" },
  ],
};

// Helper to get time slots for an activity
function getActivityTimeSlots(activityName: string, category: string): { time: string; label?: string }[] {
  // Check for activity-specific override first
  if (ACTIVITY_TIME_SLOTS[activityName]) {
    return ACTIVITY_TIME_SLOTS[activityName];
  }
  // Fall back to category default
  return ACTIVITY_TIME_SLOTS[category] || [{ time: "09:00" }, { time: "14:00" }];
}

const DEMO_RESTAURANTS = [
  { name: "Lagoon Restaurant", description: "Overwater dining with stunning views", total_capacity: 60, guest_can_book: true, guest_cutoff_minutes: 60, max_pax_per_booking: 8, requires_approval: false },
  { name: "Sunset Grill", description: "Beachfront BBQ and seafood", total_capacity: 40, guest_can_book: true, guest_cutoff_minutes: 120, max_pax_per_booking: 6, requires_approval: true },
  { name: "The Teppanyaki", description: "Japanese cuisine with live cooking", total_capacity: 24, guest_can_book: true, guest_cutoff_minutes: 180, max_pax_per_booking: 6, requires_approval: false },
];

const DEMO_GUESTS = [
  { full_name: "James Wilson", room_number: "101", nationality: "United Kingdom", daysFromNow: -2, stayLength: 7, email: "james.wilson@example.com" },
  { full_name: "Sarah Chen", room_number: "102", nationality: "Singapore", daysFromNow: -1, stayLength: 5, email: "sarah.chen@example.com" },
  { full_name: "Emma Miller", room_number: "201", nationality: "Australia", daysFromNow: 0, stayLength: 10, email: "emma.miller@example.com" },
  { full_name: "Hans Mueller", room_number: "202", nationality: "Germany", daysFromNow: 1, stayLength: 8, email: "hans.mueller@example.com" },
  { full_name: "Yuki Tanaka", room_number: "301", nationality: "Japan", daysFromNow: 2, stayLength: 6, email: "yuki.tanaka@example.com" },
];

const SAMPLE_BOOKING_NOTES = [
  "Celebrating honeymoon - please arrange special setup",
  "Guest has minor shellfish allergy",
  "First time diving, nervous but excited",
  "Anniversary dinner, requested window table",
  "Vegetarian meal preference",
  "Requested high chair for infant",
  "Would like photos during activity",
  null,
  null,
  null,
];

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function generatePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function generateToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Generate auto-login tokens for staff and guest
async function generateLoginTokens(
  supabase: any,
  workspaceId: string,
  resortId: string,
  staffUserId: string,
  guestId: string
): Promise<{ staffToken: string; guestToken: string }> {
  const staffToken = generateToken();
  const guestToken = generateToken();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

  // Clean up only expired tokens (keep active ones so older email links still work)
  await supabase
    .from("demo_login_tokens")
    .delete()
    .eq("workspace_id", workspaceId)
    .lt("expires_at", new Date().toISOString());

  // Create new tokens
  await supabase.from("demo_login_tokens").insert([
    {
      workspace_id: workspaceId,
      token: staffToken,
      token_type: "staff",
      user_id: staffUserId,
      resort_id: resortId,
      expires_at: expiresAt,
    },
    {
      workspace_id: workspaceId,
      token: guestToken,
      token_type: "guest",
      guest_id: guestId,
      resort_id: resortId,
      expires_at: expiresAt,
    },
  ]);

  return { staffToken, guestToken };
}

// Validate staff login by attempting sign-in
async function validateStaffCredentials(
  supabase: any,
  email: string,
  password: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error("Credential validation failed:", error.message);
      return { valid: false, error: error.message };
    }
    
    // Sign out immediately - we just wanted to validate
    await supabase.auth.signOut();
    
    return { valid: true };
  } catch (err: any) {
    console.error("Credential validation error:", err);
    return { valid: false, error: err?.message || "Unknown error" };
  }
}

// Get Resend client (may be null if not configured)
function getResend(): Resend | null {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  return apiKey ? new Resend(apiKey) : null;
}

// Email sending helper using Resend SDK
async function sendDemoEmail(params: {
  to: string;
  resortName: string;
  resortCode: string;
  staffIdentifier: string;
  tempPassword: string;
  guestInfo: { guestName: string; roomNumber: string; lastName: string; pin: string };
  staffToken?: string;
  guestToken?: string;
  isReminder?: boolean;
  workspaceId?: string;
  supabaseAdmin?: any;
}): Promise<{ sent: boolean; error: string }> {
  const resend = getResend();
  if (!resend) {
    console.log("RESEND_API_KEY not configured");
    return { sent: false, error: "RESEND_API_KEY not configured" };
  }

  const staffLoginUrl = params.staffToken 
    ? `${PRODUCTION_URL}/demo/login?token=${params.staffToken}`
    : `${PRODUCTION_URL}/staff/auth?username=${encodeURIComponent(params.staffIdentifier)}`;
  
  const guestLoginUrl = params.guestToken
    ? `${PRODUCTION_URL}/demo/login?token=${params.guestToken}`
    : `${PRODUCTION_URL}/resort/${params.resortCode}/guest/login?roomNumber=${encodeURIComponent(params.guestInfo.roomNumber)}&lastName=${encodeURIComponent(params.guestInfo.lastName)}`;

  const subject = params.isReminder 
    ? `🔑 Fresh login credentials for your ${params.resortName} demo`
    : `🎉 Your ${params.resortName} demo is ready!`;

  const introText = params.isReminder
    ? `Here are your fresh login credentials for <strong>${params.resortName}</strong>.`
    : `Your demo resort <strong>${params.resortName}</strong> is ready to explore.`;

  const tokenNote = params.staffToken 
    ? `<p style="margin: 8px 0 0; font-size: 12px; color: #64748b;">⚡ The "Open" buttons below let you sign in instantly (expires in 15 min)</p>`
    : '';

  try {
    console.log("Sending demo email to:", params.to);
    const result = await resend.emails.send({
      from: "Propera <noreply@propera.cc>",
      to: [params.to],
      subject,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #0f172a; margin: 0 0 8px; font-size: 28px;">Welcome to Propera!</h1>
            <p style="color: #64748b; margin: 0; font-size: 16px;">${introText}</p>
            ${tokenNote}
          </div>

          <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 12px; padding: 24px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
            <h2 style="color: #0f172a; margin: 0 0 16px; font-size: 18px;">👤 Staff Console Login</h2>
            <p style="color: #475569; margin: 0 0 16px; font-size: 14px;">Manage activities, sessions, guests, and view bookings.</p>
            <div style="background: #ffffff; border-radius: 8px; padding: 16px; margin-bottom: 16px; border: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px; font-size: 14px;"><strong>Email:</strong> <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${params.staffIdentifier}</code></p>
              <p style="margin: 0; font-size: 14px;"><strong>Password:</strong> <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${params.tempPassword}</code></p>
            </div>
            <a href="${staffLoginUrl}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">Open Staff Console →</a>
          </div>

          <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #a7f3d0;">
            <h2 style="color: #065f46; margin: 0 0 16px; font-size: 18px;">🏝️ Guest Portal Login</h2>
            <p style="color: #047857; margin: 0 0 16px; font-size: 14px;">Experience booking from the guest's perspective.</p>
            <div style="background: #ffffff; border-radius: 8px; padding: 16px; margin-bottom: 16px; border: 1px solid #a7f3d0;">
              <p style="margin: 0 0 8px; font-size: 14px;"><strong>Guest:</strong> ${params.guestInfo.guestName}</p>
              <p style="margin: 0 0 8px; font-size: 14px;"><strong>Room:</strong> ${params.guestInfo.roomNumber}</p>
              <p style="margin: 0; font-size: 14px;"><strong>PIN:</strong> <code style="background: #ecfdf5; padding: 2px 6px; border-radius: 4px; font-size: 16px; letter-spacing: 2px; font-family: monospace;">${params.guestInfo.pin}</code></p>
            </div>
            <a href="${guestLoginUrl}" style="display: inline-block; background: #059669; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">Open Guest Portal →</a>
          </div>

          <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; font-size: 13px; margin: 0 0 8px;">Your demo expires in <strong>14 days</strong>. Upgrade anytime to keep your data!</p>
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">Questions? Reply to this email or visit <a href="${PRODUCTION_URL}" style="color: #2563eb;">propera.cc</a></p>
          </div>
        </div>
      `,
    });

    console.log("Resend SDK response:", result);

    // Update last_email_sent_at if workspaceId provided
    if (params.workspaceId && params.supabaseAdmin) {
      await params.supabaseAdmin.from("demo_workspaces").update({
        last_email_sent_at: new Date().toISOString(),
      }).eq("id", params.workspaceId);
    }
    return { sent: true, error: "" };
  } catch (err: any) {
    console.error("Email send error:", err);
    return { sent: false, error: err?.message || "Unknown email error" };
  }
}

// Simplified email for singleton demo mode using Resend SDK
async function sendDemoEmailSingleton(params: {
  to: string;
  staffUrl: string;
  guestUrl: string;
  resortName: string;
}): Promise<{ sent: boolean; error: string }> {
  const resend = getResend();
  if (!resend) {
    console.log("RESEND_API_KEY not configured");
    return { sent: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    console.log("Sending singleton demo email to:", params.to);
    const result = await resend.emails.send({
      from: "Propera <noreply@propera.cc>",
      to: [params.to],
      subject: `🎉 Your ${params.resortName} demo access`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #0f172a; margin: 0 0 8px; font-size: 28px;">Welcome to Propera!</h1>
            <p style="color: #64748b; margin: 0; font-size: 16px;">Click the buttons below to explore <strong>${params.resortName}</strong></p>
            <p style="margin: 8px 0 0; font-size: 12px; color: #64748b;">⚡ One-click access links expire in 15 minutes</p>
          </div>

          <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 12px; padding: 24px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
            <h2 style="color: #0f172a; margin: 0 0 16px; font-size: 18px;">👤 Staff Console</h2>
            <p style="color: #475569; margin: 0 0 16px; font-size: 14px;">Manage activities, restaurants, and guests. View bookings and upcoming sessions for the next 2 weeks.</p>
            <a href="${params.staffUrl}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">Open Staff Console →</a>
          </div>

          <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #a7f3d0;">
            <h2 style="color: #065f46; margin: 0 0 16px; font-size: 18px;">🏝️ Guest Portal</h2>
            <p style="color: #047857; margin: 0 0 16px; font-size: 14px;">Book activities and dining from the guest's perspective. Browse sessions available this week and beyond.</p>
            <a href="${params.guestUrl}" style="display: inline-block; background: #059669; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">Open Guest Portal →</a>
          </div>

          <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="color: #475569; font-size: 13px; margin: 0; text-align: center;">
              ✨ Fresh inventory is always available for the next 14 days<br/>
              🔄 Demo data resets periodically to stay current
            </p>
          </div>

          <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; font-size: 13px; margin: 0 0 8px;">This is a shared demo – staff actions are read-only to protect the showroom.</p>
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">Questions? Reply to this email or visit <a href="${PRODUCTION_URL}" style="color: #2563eb;">propera.cc</a></p>
          </div>
        </div>
      `,
    });

    console.log("Resend SDK response:", result);
    return { sent: true, error: "" };
  } catch (err: any) {
    console.error("Singleton email send error:", err);
    return { sent: false, error: err?.message || "Unknown email error" };
  }
}

// Resend cooldown check (60 seconds)
const RESEND_COOLDOWN_SECONDS = 60;

function canResendEmail(lastEmailSentAt: string | null): { allowed: boolean; waitSeconds: number } {
  if (!lastEmailSentAt) return { allowed: true, waitSeconds: 0 };
  
  const lastSent = new Date(lastEmailSentAt).getTime();
  const now = Date.now();
  const elapsedSeconds = (now - lastSent) / 1000;
  
  if (elapsedSeconds >= RESEND_COOLDOWN_SECONDS) {
    return { allowed: true, waitSeconds: 0 };
  }
  
  return { allowed: false, waitSeconds: Math.ceil(RESEND_COOLDOWN_SECONDS - elapsedSeconds) };
}

// Rotate credentials for existing demo
async function rotateCredentials(
  supabaseAdmin: any,
  workspaceId: string,
  resortId: string,
  resortCode: string
): Promise<{
  staffIdentifier: string;
  tempPassword: string;
  staffUserId: string;
  guestInfo: { guestId: string; guestName: string; roomNumber: string; lastName: string; pin: string };
  validated: boolean;
}> {
  const tempPassword = generatePassword();
  
  // Find the existing demo admin for this resort
  const { data: membership } = await supabaseAdmin
    .from("resort_memberships")
    .select("user_id")
    .eq("resort_id", resortId)
    .eq("resort_role", "RESORT_ADMIN")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!membership) {
    throw new Error("No admin found for this demo resort");
  }

  const { data: { user: existingUser }, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(membership.user_id);
  
  if (getUserError || !existingUser) {
    throw new Error("Failed to find admin user");
  }

  console.log("Resetting password for existing admin:", existingUser.email);

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(membership.user_id, {
    password: tempPassword,
  });

  if (updateError) {
    console.error("Failed to reset admin password:", updateError);
    throw new Error("Failed to reset admin password");
  }

  const staffIdentifier = existingUser.email;
  console.log("Password reset for:", staffIdentifier);

  // Validate credentials work
  const validation = await validateStaffCredentials(supabaseAdmin, staffIdentifier, tempPassword);
  console.log("Credential validation result:", validation);

  // Refresh demo data
  await refreshDemoData(supabaseAdmin, resortId);

  // Rotate guest PIN
  const { data: demoGuest } = await supabaseAdmin
    .from("guests")
    .select("id, full_name, room_number")
    .eq("resort_id", resortId)
    .eq("room_number", "201")
    .eq("portal_enabled", true)
    .single();

  let guestInfo = {
    guestId: "",
    guestName: "Demo Guest",
    roomNumber: "101",
    lastName: "Guest",
    pin: "0000",
  };

  if (demoGuest) {
    const newPin = generatePin();
    const pinHash = await hashPin(newPin);
    await supabaseAdmin.from("guests").update({
      portal_pin_hash: pinHash,
      portal_pin_last4: newPin,
      portal_pin_set_at: new Date().toISOString(),
    }).eq("id", demoGuest.id);
    
    guestInfo.pin = newPin;
    guestInfo.guestId = demoGuest.id;

    const nameParts = demoGuest.full_name.split(" ");
    guestInfo.guestName = demoGuest.full_name;
    guestInfo.roomNumber = demoGuest.room_number;
    guestInfo.lastName = nameParts[nameParts.length - 1];
    
    console.log("Guest PIN rotated for:", demoGuest.full_name);
  }

  // Update workspace
  await supabaseAdmin.from("demo_workspaces").update({
    staff_email: staffIdentifier,
    guest_id: guestInfo.guestId || null,
    guest_room: guestInfo.roomNumber,
    guest_last_name: guestInfo.lastName,
  }).eq("id", workspaceId);

  return {
    staffIdentifier,
    tempPassword,
    staffUserId: membership.user_id,
    guestInfo,
    validated: validation.valid,
  };
}

// Refresh demo data
async function refreshDemoData(supabase: any, resortId: string): Promise<void> {
  const today = new Date();
  const todayStr = formatDate(today);
  const yesterdayStr = formatDate(addDays(today, -1));

  console.log("Refreshing demo data for resort:", resortId);

  // Delete stale activity sessions
  const { data: staleSessions } = await supabase
    .from("activity_sessions")
    .select("id")
    .eq("resort_id", resortId)
    .lt("date", yesterdayStr);

  if (staleSessions?.length) {
    const staleSessionIds = staleSessions.map((s: any) => s.id);
    await supabase.from("activity_bookings").delete().in("session_id", staleSessionIds);
    await supabase.from("activity_sessions").delete().in("id", staleSessionIds);
    console.log(`Deleted ${staleSessions.length} stale sessions`);
  }

  // Delete stale restaurant slots
  const { data: staleSlots } = await supabase
    .from("restaurant_time_slots")
    .select("id")
    .eq("resort_id", resortId)
    .lt("date", yesterdayStr);

  if (staleSlots?.length) {
    const staleSlotIds = staleSlots.map((s: any) => s.id);
    await supabase.from("restaurant_reservations").delete().in("restaurant_slot_id", staleSlotIds);
    await supabase.from("restaurant_time_slots").delete().in("id", staleSlotIds);
    console.log(`Deleted ${staleSlots.length} stale restaurant slots`);
  }

  // Get existing activities
  const { data: activities } = await supabase
    .from("activities")
    .select("id, default_max_capacity")
    .eq("resort_id", resortId);

  // Find furthest date with sessions
  const { data: latestSession } = await supabase
    .from("activity_sessions")
    .select("date")
    .eq("resort_id", resortId)
    .order("date", { ascending: false })
    .limit(1)
    .single();

  const lastExistingDate = latestSession?.date ? new Date(latestSession.date) : addDays(today, -1);
  const daysToAdd = Math.max(0, 14 - Math.ceil((lastExistingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  if (activities?.length && daysToAdd > 0) {
    const sessions: any[] = [];
    const startDay = Math.ceil((lastExistingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    for (let day = startDay; day <= startDay + daysToAdd; day++) {
      const sessionDate = formatDate(addDays(today, day));
      activities.forEach((activity: any) => {
        sessions.push({
          resort_id: resortId,
          activity_id: activity.id,
          date: sessionDate,
          start_time: "09:00",
          end_time: "10:30",
          capacity: activity.default_max_capacity,
          status: "SCHEDULED",
        });
        if (day % 2 === 0) {
          sessions.push({
            resort_id: resortId,
            activity_id: activity.id,
            date: sessionDate,
            start_time: "14:00",
            end_time: "15:30",
            capacity: activity.default_max_capacity,
            status: "SCHEDULED",
          });
        }
      });
    }
    
    if (sessions.length) {
      await supabase.from("activity_sessions").insert(sessions);
      console.log(`Created ${sessions.length} new activity sessions`);
    }
  }

  // Refresh restaurant slots
  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("id, total_capacity")
    .eq("resort_id", resortId);

  const { data: latestSlot } = await supabase
    .from("restaurant_time_slots")
    .select("date")
    .eq("resort_id", resortId)
    .order("date", { ascending: false })
    .limit(1)
    .single();

  const lastExistingSlotDate = latestSlot?.date ? new Date(latestSlot.date) : addDays(today, -1);
  const slotDaysToAdd = Math.max(0, 14 - Math.ceil((lastExistingSlotDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  if (restaurants?.length && slotDaysToAdd > 0) {
    const slots: any[] = [];
    const startDay = Math.ceil((lastExistingSlotDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    for (let day = startDay; day <= startDay + slotDaysToAdd; day++) {
      const slotDate = formatDate(addDays(today, day));
      restaurants.forEach((restaurant: any) => {
        slots.push({ resort_id: resortId, restaurant_id: restaurant.id, date: slotDate, start_time: "07:00", end_time: "10:00", meal_period: "BREAKFAST", capacity: restaurant.total_capacity, status: "OPEN" });
        slots.push({ resort_id: resortId, restaurant_id: restaurant.id, date: slotDate, start_time: "12:00", end_time: "14:30", meal_period: "LUNCH", capacity: Math.floor(restaurant.total_capacity * 0.7), status: "OPEN" });
        slots.push({ resort_id: resortId, restaurant_id: restaurant.id, date: slotDate, start_time: "19:00", end_time: "20:30", meal_period: "DINNER", capacity: Math.floor(restaurant.total_capacity / 2), status: "OPEN" });
        slots.push({ resort_id: resortId, restaurant_id: restaurant.id, date: slotDate, start_time: "20:30", end_time: "22:00", meal_period: "DINNER", capacity: Math.floor(restaurant.total_capacity / 2), status: "OPEN" });
      });
    }
    
    if (slots.length) {
      await supabase.from("restaurant_time_slots").insert(slots);
      console.log(`Created ${slots.length} new restaurant slots`);
    }
  }

  // Update guest dates
  const { data: existingGuests } = await supabase
    .from("guests")
    .select("id, room_number")
    .eq("resort_id", resortId);

  if (existingGuests?.length) {
    for (const guest of existingGuests) {
      const template = DEMO_GUESTS.find(g => g.room_number === guest.room_number);
      if (template) {
        await supabase.from("guests").update({
          check_in_date: formatDate(addDays(today, template.daysFromNow)),
          check_out_date: formatDate(addDays(today, template.daysFromNow + template.stayLength)),
          updated_at: new Date().toISOString(),
        }).eq("id", guest.id);
      }
    }
    console.log(`Updated ${existingGuests.length} guest dates`);
  }

  console.log("Demo data refresh complete");
}

// Seed sample service requests for demo guests
async function seedSampleServiceRequests(
  supabase: any,
  resortId: string,
  guestId: string,
  roomNumber: string
): Promise<void> {
  console.log("Checking for existing sample service requests...");
  
  // Check if sample requests already exist for this guest
  const { count } = await supabase
    .from("service_requests")
    .select("id", { count: "exact", head: true })
    .eq("guest_id", guestId);
  
  if (count && count > 0) {
    console.log(`Found ${count} existing service requests, skipping seeding`);
    return;
  }
  
  // Fetch catalog items for seeding
  const { data: catalogItems } = await supabase
    .from("request_catalog")
    .select("id, title, department_key, description")
    .eq("resort_id", resortId)
    .limit(10);
  
  if (!catalogItems || catalogItems.length < 3) {
    console.log("Not enough catalog items for seeding, skipping");
    return;
  }
  
  // Find specific catalog items for realistic requests
  const housekeepingItem = catalogItems.find((c: any) => c.department_key === "HOUSEKEEPING");
  const minibarItem = catalogItems.find((c: any) => c.department_key === "MINIBAR");
  const engineeringItem = catalogItems.find((c: any) => c.department_key === "ENGINEERING") || catalogItems[2];
  
  if (!housekeepingItem || !minibarItem) {
    console.log("Required catalog items not found, skipping service request seeding");
    return;
  }
  
  const now = new Date();
  const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  
  // Helper: Generate context-aware sample note based on catalog item
  const getSampleNote = (item: any, department: string): string => {
    const title = (item.title || '').toLowerCase();
    
    // Minibar-specific notes
    if (department === 'MINIBAR') {
      if (title.includes('water')) return '2 bottles of still water please';
      if (title.includes('wine') || title.includes('champagne')) return 'Could we have a bottle chilled for tonight?';
      if (title.includes('refill')) return 'Full minibar restock please';
      return `Could we get some ${item.title} please?`;
    }
    
    // Housekeeping-specific notes
    if (department === 'HOUSEKEEPING') {
      if (title.includes('towel')) return 'Extra bath towels for 4 guests please';
      if (title.includes('linen') || title.includes('sheet')) return 'Fresh linens would be appreciated';
      if (title.includes('turndown')) return 'Turndown service at 7pm please';
      if (title.includes('cleaning') || title.includes('clean')) return 'Room cleaning when convenient';
      return 'Thank you!';
    }
    
    // Engineering/Maintenance-specific notes
    if (department === 'ENGINEERING') {
      if (title.includes('ac') || title.includes('air con')) return 'The AC seems to be making a strange noise';
      if (title.includes('light')) return 'The bathroom light is flickering';
      if (title.includes('tv')) return 'TV remote is not working';
      if (title.includes('wifi') || title.includes('internet')) return 'WiFi connection keeps dropping';
      if (title.includes('plumb') || title.includes('water') || title.includes('drain')) return 'Shower drain is slow';
      return `Issue with ${item.title} - needs attention`;
    }
    
    // Concierge
    if (department === 'CONCIERGE') {
      return 'Could you help arrange this for us?';
    }
    
    return 'Thank you for your assistance!';
  };

  // Sample requests with different statuses
  const sampleRequests = [
    {
      // NEW - Just submitted, unacknowledged
      resort_id: resortId,
      guest_id: guestId,
      catalog_id: minibarItem.id,
      title: minibarItem.title,
      department_key: minibarItem.department_key,
      notes: getSampleNote(minibarItem, minibarItem.department_key),
      is_asap: true,
      priority: "NORMAL",
      status: "NEW",
      created_at: thirtyMinAgo.toISOString(),
    },
    {
      // IN_PROGRESS - Assigned and being worked on
      resort_id: resortId,
      guest_id: guestId,
      catalog_id: housekeepingItem.id,
      title: housekeepingItem.title,
      department_key: housekeepingItem.department_key,
      notes: getSampleNote(housekeepingItem, housekeepingItem.department_key),
      is_asap: true,
      priority: "NORMAL",
      status: "IN_PROGRESS",
      created_at: twoHoursAgo.toISOString(),
      acknowledged_at: new Date(twoHoursAgo.getTime() + 5 * 60 * 1000).toISOString(),
      assigned_at: new Date(twoHoursAgo.getTime() + 10 * 60 * 1000).toISOString(),
    },
    {
      // COMPLETED - Finished request
      resort_id: resortId,
      guest_id: guestId,
      catalog_id: engineeringItem.id,
      title: engineeringItem.title,
      department_key: engineeringItem.department_key,
      notes: getSampleNote(engineeringItem, engineeringItem.department_key),
      internal_notes: "Issue resolved, all working now",
      is_asap: false,
      requested_for_at: new Date(fourHoursAgo.getTime() + 60 * 60 * 1000).toISOString(),
      priority: "HIGH",
      status: "COMPLETED",
      created_at: fourHoursAgo.toISOString(),
      acknowledged_at: new Date(fourHoursAgo.getTime() + 3 * 60 * 1000).toISOString(),
      assigned_at: new Date(fourHoursAgo.getTime() + 5 * 60 * 1000).toISOString(),
      completed_at: new Date(fourHoursAgo.getTime() + 45 * 60 * 1000).toISOString(),
    },
  ];
  
  const { error } = await supabase
    .from("service_requests")
    .insert(sampleRequests);
  
  if (error) {
    console.error("Failed to seed sample service requests:", error);
  } else {
    console.log(`Seeded ${sampleRequests.length} sample service requests for demo guest`);
  }
}

// Shared Golden Demo Resort Constants
const DEMO_RESORT_CODE = "DEMO";
const DEMO_RESORT_NAME = "Propera Demo Resort";
const DEMO_TOKEN_TTL_MIN = 15;
const SHARED_WORKSPACE_EMAIL = "__shared_demo__";
const DEMO_STAFF_EMAIL = "demo-staff@propera.cc";
const DEMO_GUEST_ROOM = "101";
const DEMO_GUEST_NAME = "James Wilson"; // Matches demo-reset auto-heal expectations

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { email, resort_name, timezone, rooms_range, departments, mode = "provision", utm } = body;

    // For start-demo-singleton, email is required. For other modes, check as before.
    if (!email && mode !== "consume-guest-token" && mode !== "consume-staff-token") {
      return new Response(JSON.stringify({ success: false, error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Demo request:", { email, resort_name, mode });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // ============================================================
    // MODE: start-demo-singleton - Shared Golden Demo Resort
    // ============================================================
    if (mode === "start-demo-singleton") {
      const normalizedEmail = email.trim().toLowerCase();
      console.log("Start demo singleton mode for:", normalizedEmail);

      // 1a. Fetch existing lead's last_seen_at BEFORE upsert (for accurate cooldown check)
      const { data: existingLead } = await supabaseAdmin
        .from("demo_leads")
        .select("last_seen_at")
        .eq("email", normalizedEmail)
        .maybeSingle();

      const previousLastSeenAt = existingLead?.last_seen_at || null;
      console.log("Previous last_seen_at for cooldown check:", previousLastSeenAt);

      // 1b. Upsert into demo_leads (this updates last_seen_at to now)
      const { data: lead, error: leadError } = await supabaseAdmin
        .from("demo_leads")
        .upsert(
          {
            email: normalizedEmail,
            last_seen_at: new Date().toISOString(),
            utm_source: utm?.source || null,
            utm_medium: utm?.medium || null,
            utm_campaign: utm?.campaign || null,
          },
          { onConflict: "email" }
        )
        .select()
        .single();

      if (leadError) {
        console.error("Lead upsert error:", leadError);
      }

      // 2. Ensure shared demo resort exists (idempotent)
      let { data: demoResort } = await supabaseAdmin
        .from("resorts")
        .select("*")
        .eq("code", DEMO_RESORT_CODE)
        .single();

      if (!demoResort) {
        console.log("Creating shared demo resort...");
        const { data: newResort, error: resortError } = await supabaseAdmin
          .from("resorts")
          .insert({
            name: DEMO_RESORT_NAME,
            code: DEMO_RESORT_CODE,
            timezone: "Indian/Maldives",
            currency: "USD",
            status: "ACTIVE",
            is_demo: true,
            subscription_tier: "ELITE",
            onboarding_status: "COMPLETED",
          })
          .select()
          .single();

        if (resortError) {
          console.error("Failed to create demo resort:", resortError);
          throw new Error("Failed to create shared demo resort");
        }
        demoResort = newResort;
        console.log("Created demo resort:", demoResort.id);

        // Seed the shared demo with data
        const departments = ["dive", "watersports", "spa", "excursions", "dining"];
        await seedDemoData(supabaseAdmin, demoResort.id, departments, DEMO_RESORT_CODE);
        console.log("Seeded demo data for shared resort");
        
        // Initialize guest requests system (departments, catalog, retention policy)
        await supabaseAdmin.rpc('initialize_guest_requests_for_resort', { 
          p_resort_id: demoResort.id 
        });
        console.log("Initialized guest requests for demo resort");
      } else {
        // Check if activities exist - if not, seeding may have failed before
        const { count: activityCount } = await supabaseAdmin
          .from("activities")
          .select("id", { count: "exact", head: true })
          .eq("resort_id", demoResort.id);
        
        if (!activityCount || activityCount === 0) {
          console.log("Demo resort exists but activities missing, reseeding...");
          const departments = ["dive", "watersports", "spa", "excursions", "dining"];
          await seedDemoData(supabaseAdmin, demoResort.id, departments, DEMO_RESORT_CODE);
          console.log("Reseeded demo data for shared resort");
        }
        
        // Ensure guest requests are initialized
        const { count: deptCount } = await supabaseAdmin
          .from("departments")
          .select("id", { count: "exact", head: true })
          .eq("resort_id", demoResort.id);
        
        if (!deptCount || deptCount === 0) {
          console.log("Guest requests not initialized, setting up...");
          await supabaseAdmin.rpc('initialize_guest_requests_for_resort', { 
            p_resort_id: demoResort.id 
          });
          console.log("Initialized guest requests for demo resort");
        }
      }

      // 3. Ensure shared workspace exists
      let { data: sharedWorkspace } = await supabaseAdmin
        .from("demo_workspaces")
        .select("*")
        .eq("email", SHARED_WORKSPACE_EMAIL)
        .single();

      if (!sharedWorkspace) {
        console.log("Creating shared workspace...");
        const { data: newWorkspace, error: wsError } = await supabaseAdmin
          .from("demo_workspaces")
          .insert({
            email: SHARED_WORKSPACE_EMAIL,
            resort_name: DEMO_RESORT_NAME,
            resort_id: demoResort.id,
            resort_code: DEMO_RESORT_CODE,
            timezone: demoResort.timezone,
            status: "ready",
            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
          })
          .select()
          .single();

        if (wsError) {
          console.error("Failed to create shared workspace:", wsError);
          throw new Error("Failed to create shared workspace");
        }
        sharedWorkspace = newWorkspace;
      }

      // 4. Ensure fixed demo staff user exists
      let demoStaffUserId: string | null = null;

      const { data: existingMembership } = await supabaseAdmin
        .from("resort_memberships")
        .select("user_id")
        .eq("resort_id", demoResort.id)
        .eq("resort_role", "RESORT_ADMIN")
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (existingMembership) {
        demoStaffUserId = existingMembership.user_id;
      } else {
        // Create demo staff user
        console.log("Creating demo staff user...");
        const demoPassword = generatePassword();
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: DEMO_STAFF_EMAIL,
          password: demoPassword,
          email_confirm: true,
          user_metadata: { full_name: "Demo Admin", is_demo_user: true },
        });

        if (authError && !authError.message.includes("already been registered")) {
          console.error("Failed to create demo staff:", authError);
          throw new Error("Failed to create demo staff user");
        }

        if (authUser?.user) {
          demoStaffUserId = authUser.user.id;

          await supabaseAdmin.from("profiles").upsert({
            id: demoStaffUserId,
            username: "demo.admin",
            full_name: "Demo Admin",
            global_role: "STANDARD",
          });

          await supabaseAdmin.from("resort_memberships").insert({
            user_id: demoStaffUserId,
            resort_id: demoResort.id,
            resort_role: "RESORT_ADMIN",
          });
        } else {
          // User exists, find them
          const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
          const existingUser = existingUsers?.users?.find((u: any) => u.email === DEMO_STAFF_EMAIL);
          if (existingUser) {
            demoStaffUserId = existingUser.id;
            // Ensure membership exists
            await supabaseAdmin.from("resort_memberships").upsert({
              user_id: demoStaffUserId,
              resort_id: demoResort.id,
              resort_role: "RESORT_ADMIN",
            }, { onConflict: "user_id,resort_id" });
          }
        }
      }

      // Update shared workspace with staff info
      if (demoStaffUserId && !sharedWorkspace.staff_user_id) {
        await supabaseAdmin.from("demo_workspaces").update({
          staff_user_id: demoStaffUserId,
          staff_email: DEMO_STAFF_EMAIL,
        }).eq("id", sharedWorkspace.id);
        sharedWorkspace.staff_user_id = demoStaffUserId;
        sharedWorkspace.staff_email = DEMO_STAFF_EMAIL;
      }

      // 5. Ensure fixed demo guest exists
      let { data: demoGuest } = await supabaseAdmin
        .from("guests")
        .select("*")
        .eq("resort_id", demoResort.id)
        .eq("room_number", DEMO_GUEST_ROOM)
        .eq("portal_enabled", true)
        .single();

      const today = new Date();
      if (!demoGuest) {
        console.log("Creating demo guest...");
        const guestPin = generatePin();
        const pinHash = await hashPin(guestPin);

        const { data: newGuest, error: guestError } = await supabaseAdmin
          .from("guests")
          .insert({
            resort_id: demoResort.id,
            full_name: DEMO_GUEST_NAME,
            room_number: DEMO_GUEST_ROOM,
            nationality: "United Kingdom",
            email: "james.wilson@example.com",
            check_in_date: formatDate(addDays(today, -2)), // In-house guest (arrived 2 days ago)
            check_out_date: formatDate(addDays(today, 5)), // Departing in 5 days
            portal_enabled: true,
            portal_pin_hash: pinHash,
            portal_pin_last4: guestPin.slice(-4),
            portal_pin_set_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (guestError) {
          console.error("Failed to create demo guest:", guestError);
        } else {
          demoGuest = newGuest;
        }
      } else {
        // Ensure guest dates are current, name matches, and PIN is set
        const updates: any = {
          full_name: DEMO_GUEST_NAME, // Ensure name is aligned
          nationality: "United Kingdom",
          email: "james.wilson@example.com",
          check_in_date: formatDate(addDays(today, -2)), // In-house guest
          check_out_date: formatDate(addDays(today, 5)),
        };
        
        // If PIN is missing, generate one
        if (!demoGuest.portal_pin_hash) {
          console.log("Demo guest missing PIN, generating...");
          const guestPin = generatePin();
          const pinHash = await hashPin(guestPin);
          updates.portal_pin_hash = pinHash;
          updates.portal_pin_last4 = guestPin.slice(-4);
          updates.portal_pin_set_at = new Date().toISOString();
        }
        
        await supabaseAdmin.from("guests").update(updates).eq("id", demoGuest.id);
        // Refresh demoGuest with updated values
        demoGuest = { ...demoGuest, ...updates };
      }

      // Update shared workspace with guest info
      if (demoGuest && !sharedWorkspace.guest_id) {
        const nameParts = demoGuest.full_name.split(" ");
        await supabaseAdmin.from("demo_workspaces").update({
          guest_id: demoGuest.id,
          guest_room: demoGuest.room_number,
          guest_last_name: nameParts[nameParts.length - 1],
        }).eq("id", sharedWorkspace.id);
        sharedWorkspace.guest_id = demoGuest.id;
        sharedWorkspace.guest_room = demoGuest.room_number;
        sharedWorkspace.guest_last_name = nameParts[nameParts.length - 1];
      }

      // 5b. Seed sample service requests for demo guest (idempotent)
      if (demoGuest) {
        await seedSampleServiceRequests(
          supabaseAdmin,
          demoResort.id,
          demoGuest.id,
          demoGuest.room_number
        );
      }

      // 5c. Auto-heal: Ensure demo guest has activity bookings and restaurant reservations
      if (demoGuest) {
        const todayStr = formatDate(today);
        const next7Days = formatDate(addDays(today, 7));

        // Check activity bookings count
        const { count: bookingsCount } = await supabaseAdmin
          .from("activity_bookings")
          .select("id", { count: "exact", head: true })
          .eq("resort_id", demoResort.id)
          .eq("guest_id", demoGuest.id)
          .eq("origin", "seed");

        // Seed activity bookings if below threshold (5 bookings)
        if (!bookingsCount || bookingsCount < 5) {
          console.log(`Auto-healing activity bookings: ${bookingsCount || 0} found, seeding more...`);
          
          const { data: upcomingSessions } = await supabaseAdmin
            .from("activity_sessions")
            .select(`
              id, activity_id, date, start_time,
              activities(name, category, default_price_per_person)
            `)
            .eq("resort_id", demoResort.id)
            .eq("status", "SCHEDULED")
            .gte("date", todayStr)
            .lte("date", next7Days)
            .order("date", { ascending: true });

          if (upcomingSessions?.length) {
            // Pick one session per category for variety
            const categoryPicks = new Map<string, any>();
            const extraSessions: any[] = [];
            
            for (const session of upcomingSessions) {
              const cat = (session.activities as any)?.category;
              if (!cat) continue;
              
              if (!categoryPicks.has(cat)) {
                categoryPicks.set(cat, session);
              } else if (extraSessions.length < 2) {
                extraSessions.push(session);
              }
            }
            
            const sessionsToBook = [...categoryPicks.values(), ...extraSessions].slice(0, 5 - (bookingsCount || 0));
            
            for (let i = 0; i < sessionsToBook.length; i++) {
              const session = sessionsToBook[i];
              const price = (session.activities as any)?.default_price_per_person || 50;
              const isLastOne = i === sessionsToBook.length - 1;
              
              await supabaseAdmin.from("activity_bookings").insert({
                resort_id: demoResort.id,
                guest_id: demoGuest.id,
                session_id: session.id,
                room_number: demoGuest.room_number,
                num_adults: 2,
                num_children: 0,
                status: isLastOne ? "PENDING" : "CONFIRMED",
                source: "STAFF",
                origin: "seed",
                price_per_person: price,
                total_amount: price * 2,
              });
            }
            console.log(`Seeded ${sessionsToBook.length} activity bookings for demo guest`);
          }
        }

        // Check restaurant reservations count
        const { count: reservationsCount } = await supabaseAdmin
          .from("restaurant_reservations")
          .select("id", { count: "exact", head: true })
          .eq("resort_id", demoResort.id)
          .eq("guest_id", demoGuest.id)
          .eq("origin", "seed");

        // Seed restaurant reservations if below threshold (3 reservations)
        if (!reservationsCount || reservationsCount < 3) {
          console.log(`Auto-healing restaurant reservations: ${reservationsCount || 0} found, seeding more...`);
          
          const { data: upcomingSlots } = await supabaseAdmin
            .from("restaurant_time_slots")
            .select(`
              id, restaurant_id, date, start_time, meal_period,
              restaurants(name)
            `)
            .eq("resort_id", demoResort.id)
            .eq("status", "OPEN")
            .gte("date", todayStr)
            .lte("date", next7Days)
            .order("date", { ascending: true });

          if (upcomingSlots?.length) {
            const restaurantPicks = new Map<string, any>();
            
            for (const slot of upcomingSlots) {
              const restId = slot.restaurant_id;
              if (!restaurantPicks.has(restId) || restaurantPicks.size < 3) {
                restaurantPicks.set(`${restId}-${restaurantPicks.size}`, slot);
              }
              if (restaurantPicks.size >= 3) break;
            }
            
            const slotsToBook = [...restaurantPicks.values()].slice(0, 3 - (reservationsCount || 0));
            
            for (const slot of slotsToBook) {
              await supabaseAdmin.from("restaurant_reservations").insert({
                resort_id: demoResort.id,
                guest_id: demoGuest.id,
                restaurant_slot_id: slot.id,
                room_number: demoGuest.room_number,
                num_adults: 2,
                num_children: 0,
                status: "CONFIRMED",
                source: "STAFF",
                origin: "seed",
              });
            }
            console.log(`Seeded ${slotsToBook.length} restaurant reservations for demo guest`);
          }
        }
      }

      // 6. Generate short-lived tokens (15 min TTL, reusable within window)
      const staffToken = generateToken();
      const guestToken = generateToken();
      const tokenExpiresAt = new Date(Date.now() + DEMO_TOKEN_TTL_MIN * 60 * 1000).toISOString();

      // Clean up old expired tokens for this workspace
      await supabaseAdmin
        .from("demo_login_tokens")
        .delete()
        .eq("workspace_id", sharedWorkspace.id)
        .lt("expires_at", new Date().toISOString());

      // Insert new tokens with lead reference
      await supabaseAdmin.from("demo_login_tokens").insert([
        {
          workspace_id: sharedWorkspace.id,
          token: staffToken,
          token_type: "staff",
          user_id: demoStaffUserId,
          resort_id: demoResort.id,
          expires_at: tokenExpiresAt,
          demo_lead_id: lead?.id || null,
        },
        {
          workspace_id: sharedWorkspace.id,
          token: guestToken,
          token_type: "guest",
          guest_id: demoGuest?.id,
          resort_id: demoResort.id,
          expires_at: tokenExpiresAt,
          demo_lead_id: lead?.id || null,
        },
      ]);

      const staffUrl = `${PRODUCTION_URL}/demo/login?token=${staffToken}`;
      const guestUrl = `${PRODUCTION_URL}/demo/login?token=${guestToken}`;

      // 7. Send email (with cooldown check based on lead's PREVIOUS last_seen_at)
      let emailSent = false;
      let emailError = "";

      // Use the captured previousLastSeenAt from BEFORE the upsert (fixes race condition)
      const cooldownCheck = canResendEmail(previousLastSeenAt);
      console.log("Email cooldown check:", { previousLastSeenAt, allowed: cooldownCheck.allowed, waitSeconds: cooldownCheck.waitSeconds });

      if (cooldownCheck.allowed) {
        const resendResult = await sendDemoEmailSingleton({
          to: normalizedEmail,
          staffUrl,
          guestUrl,
          resortName: DEMO_RESORT_NAME,
        });
        emailSent = resendResult.sent;
        emailError = resendResult.error;
      } else {
        emailError = `Please wait ${cooldownCheck.waitSeconds}s before requesting another email`;
      }

      // 8. Return immediate response with URLs
      return new Response(JSON.stringify({
        success: true,
        staffUrl,
        guestUrl,
        leadId: lead?.id || null,
        resortCode: DEMO_RESORT_CODE,
        resortName: DEMO_RESORT_NAME,
        resortId: demoResort.id,
        emailSent,
        emailError: emailSent ? null : emailError,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // MODE: regenerate-credentials - rotate password/PIN and generate new tokens
    if (mode === "regenerate-credentials") {
      console.log("Regenerate credentials mode for:", email);

      const { data: workspace } = await supabaseAdmin
        .from("demo_workspaces")
        .select("*")
        .eq("email", email.toLowerCase())
        .eq("status", "ready")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!workspace) {
        return new Response(JSON.stringify({ success: false, error: "No active demo found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const rotated = await rotateCredentials(supabaseAdmin, workspace.id, workspace.resort_id, workspace.resort_code);
      
      // Generate new login tokens
      const tokens = await generateLoginTokens(
        supabaseAdmin,
        workspace.id,
        workspace.resort_id,
        rotated.staffUserId,
        rotated.guestInfo.guestId
      );

        const staffLoginUrl = `${PRODUCTION_URL}/demo/login?token=${tokens.staffToken}`;
        const guestLoginUrl = `${PRODUCTION_URL}/demo/login?token=${tokens.guestToken}`;

      // Send email
      const emailResult = await sendDemoEmail({
        to: email,
        resortName: workspace.resort_name,
        resortCode: workspace.resort_code,
        staffIdentifier: rotated.staffIdentifier,
        tempPassword: rotated.tempPassword,
        guestInfo: rotated.guestInfo,
        staffToken: tokens.staffToken,
        guestToken: tokens.guestToken,
        isReminder: true,
      });

      return new Response(JSON.stringify({
        success: true,
        regenerated: true,
        workspace_id: workspace.id,
        resort_id: workspace.resort_id,
        resort_code: workspace.resort_code,
        staff_email: rotated.staffIdentifier,
        temp_password: rotated.tempPassword,
        staff_login_url: staffLoginUrl,
        staff_token: tokens.staffToken,
        guest_login: {
          guest_name: rotated.guestInfo.guestName,
          room_number: rotated.guestInfo.roomNumber,
          last_name: rotated.guestInfo.lastName,
          pin: rotated.guestInfo.pin,
          portal_url: guestLoginUrl,
        },
        guest_token: tokens.guestToken,
        credentials_validated: rotated.validated,
        email_sent: emailResult.sent,
        expires_at: workspace.expires_at,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // MODE: reseed - re-run data seeding
    if (mode === "reseed") {
      console.log("Reseed mode for:", email);

      const { data: workspace } = await supabaseAdmin
        .from("demo_workspaces")
        .select("*")
        .eq("email", email.toLowerCase())
        .eq("status", "ready")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!workspace) {
        return new Response(JSON.stringify({ success: false, error: "No active demo found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await refreshDemoData(supabaseAdmin, workspace.resort_id);
      
      await supabaseAdmin.from("demo_workspaces").update({
        seeded_at: new Date().toISOString(),
      }).eq("id", workspace.id);

      return new Response(JSON.stringify({
        success: true,
        reseeded: true,
        workspace_id: workspace.id,
        resort_id: workspace.resort_id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // MODE: generate-tokens - generate new login tokens without changing credentials
    if (mode === "generate-tokens") {
      console.log("Generate tokens mode for:", email);

      const { data: workspace } = await supabaseAdmin
        .from("demo_workspaces")
        .select("*")
        .eq("email", email.toLowerCase())
        .eq("status", "ready")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!workspace) {
        return new Response(JSON.stringify({ success: false, error: "No active demo found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const tokens = await generateLoginTokens(
        supabaseAdmin,
        workspace.id,
        workspace.resort_id,
        workspace.staff_user_id,
        workspace.guest_id
      );

      return new Response(JSON.stringify({
        success: true,
        workspace_id: workspace.id,
        staff_token: tokens.staffToken,
        guest_token: tokens.guestToken,
        staff_login_url: `${PRODUCTION_URL}/demo/login?token=${tokens.staffToken}`,
        guest_login_url: `${PRODUCTION_URL}/demo/login?token=${tokens.guestToken}`,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // MODE: request-fresh-link - for expired tokens, generate new tokens and resend email
    // This allows users to request a new link without re-entering the form
    if (mode === "request-fresh-link") {
      const { token, token_type } = body;
      console.log("Request fresh link mode for token type:", token_type);

      // First, try to find the workspace from the token
      let workspaceId: string | null = null;
      
      if (token) {
        const { data: tokenRecord } = await supabaseAdmin
          .from("demo_login_tokens")
          .select("workspace_id")
          .eq("token", token)
          .single();
        
        if (tokenRecord) {
          workspaceId = tokenRecord.workspace_id;
        }
      }

      if (!workspaceId) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Could not identify demo workspace. Please use the Book Demo form to start fresh.",
          redirect_to_form: true 
        }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch the workspace
      const { data: workspace } = await supabaseAdmin
        .from("demo_workspaces")
        .select("*")
        .eq("id", workspaceId)
        .eq("status", "ready")
        .gt("expires_at", new Date().toISOString())
        .single();

      if (!workspace) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Demo has expired. Please create a new demo.",
          redirect_to_form: true 
        }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check resend cooldown
      const cooldownCheck = canResendEmail(workspace.last_email_sent_at);
      if (!cooldownCheck.allowed) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: `Please wait ${cooldownCheck.waitSeconds} seconds before requesting another email.`,
          cooldown_seconds: cooldownCheck.waitSeconds 
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Rotate credentials and generate new tokens
      const rotated = await rotateCredentials(supabaseAdmin, workspace.id, workspace.resort_id, workspace.resort_code);
      
      const tokens = await generateLoginTokens(
        supabaseAdmin,
        workspace.id,
        workspace.resort_id,
        rotated.staffUserId,
        rotated.guestInfo.guestId
      );

      // Send email
      const emailResult = await sendDemoEmail({
        to: workspace.email,
        resortName: workspace.resort_name,
        resortCode: workspace.resort_code,
        staffIdentifier: rotated.staffIdentifier,
        tempPassword: rotated.tempPassword,
        guestInfo: rotated.guestInfo,
        staffToken: tokens.staffToken,
        guestToken: tokens.guestToken,
        isReminder: true,
        workspaceId: workspace.id,
        supabaseAdmin,
      });

      return new Response(JSON.stringify({
        success: true,
        email_sent: emailResult.sent,
        email_sent_to: workspace.email,
        message: emailResult.sent 
          ? `Fresh login link sent to ${workspace.email}` 
          : "Failed to send email - please try again",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // MODE: consume-guest-token - validate and consume a guest auto-login token
    // Allows re-use within TTL to handle email client link prefetching
    if (mode === "consume-guest-token") {
      const { token } = body;
      const tokenPrefix = token ? token.substring(0, 6) : "none";
      console.log(`Consume guest token mode, token prefix: ${tokenPrefix}`);

      if (!token) {
        return new Response(JSON.stringify({ success: false, error: "Token is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Find and validate the token
      const { data: tokenRecord, error: tokenError } = await supabaseAdmin
        .from("demo_login_tokens")
        .select("*")
        .eq("token", token)
        .eq("token_type", "guest")
        .single();

      if (tokenError || !tokenRecord) {
        console.error(`Token lookup failed (prefix ${tokenPrefix}):`, tokenError);
        return new Response(JSON.stringify({ success: false, error: "Token not found - the link may be old or invalid" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check expiry (this is the hard limit)
      if (new Date(tokenRecord.expires_at) < new Date()) {
        console.log(`Token expired (prefix ${tokenPrefix}), expired at: ${tokenRecord.expires_at}`);
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Token expired - please generate a new demo link",
          expired: true,
          can_request_fresh_link: true,
          token: token, // Include token for request-fresh-link mode
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Allow re-use within TTL (handles email client prefetching)
      // Only log if it's a re-use, don't fail
      if (tokenRecord.used_at) {
        console.log(`Token reused (prefix ${tokenPrefix}), originally used at: ${tokenRecord.used_at}`);
      } else {
        // Mark token as used on first use
        await supabaseAdmin
          .from("demo_login_tokens")
          .update({ used_at: new Date().toISOString() })
          .eq("id", tokenRecord.id);
        console.log(`Token first use (prefix ${tokenPrefix})`);
      }

      // Fetch guest and resort separately (FK now exists but separate queries are more robust)
      const { data: guest } = await supabaseAdmin
        .from("guests")
        .select("*")
        .eq("id", tokenRecord.guest_id)
        .single();

      const { data: resort } = await supabaseAdmin
        .from("resorts")
        .select("*")
        .eq("id", tokenRecord.resort_id)
        .single();

      return new Response(JSON.stringify({
        success: true,
        guest_id: tokenRecord.guest_id,
        full_name: guest?.full_name,
        room_number: guest?.room_number,
        check_in_date: guest?.check_in_date,
        check_out_date: guest?.check_out_date,
        resort_id: tokenRecord.resort_id,
        resort_name: resort?.name,
        resort_code: resort?.code,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // MODE: consume-staff-token - validate and consume a staff auto-login token
    // Allows re-use within TTL to handle email client link prefetching
    if (mode === "consume-staff-token") {
      const { token } = body;
      const tokenPrefix = token ? token.substring(0, 6) : "none";
      console.log(`Consume staff token mode, token prefix: ${tokenPrefix}`);

      if (!token) {
        return new Response(JSON.stringify({ success: false, error: "Token is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Find and validate the token
      const { data: tokenRecord, error: tokenError } = await supabaseAdmin
        .from("demo_login_tokens")
        .select("*, demo_workspaces(*)")
        .eq("token", token)
        .eq("token_type", "staff")
        .single();

      if (tokenError || !tokenRecord) {
        console.error(`Token lookup failed (prefix ${tokenPrefix}):`, tokenError);
        return new Response(JSON.stringify({ success: false, error: "Token not found - the link may be old or invalid" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check expiry (this is the hard limit)
      if (new Date(tokenRecord.expires_at) < new Date()) {
        console.log(`Token expired (prefix ${tokenPrefix}), expired at: ${tokenRecord.expires_at}`);
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Token expired - please generate a new demo link",
          expired: true,
          can_request_fresh_link: true,
          token: token, // Include token for request-fresh-link mode
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // For staff, we need to generate a fresh password and update the user
      const workspace = tokenRecord.demo_workspaces;
      
      if (!workspace || !workspace.staff_user_id) {
        return new Response(JSON.stringify({ success: false, error: "Staff user not found for this token" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate new temp password and update auth user
      // This is idempotent - each token use gets a fresh password
      const tempPassword = generatePassword();
      
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(workspace.staff_user_id, {
        password: tempPassword,
      });

      if (updateError) {
        console.error("Failed to update staff password:", updateError);
        return new Response(JSON.stringify({ success: false, error: "Failed to prepare login" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Log re-use vs first use, but always succeed
      if (tokenRecord.used_at) {
        console.log(`Token reused (prefix ${tokenPrefix}), originally used at: ${tokenRecord.used_at}`);
      } else {
        // Mark token as used on first use
        await supabaseAdmin
          .from("demo_login_tokens")
          .update({ used_at: new Date().toISOString() })
          .eq("id", tokenRecord.id);
        console.log(`Token first use (prefix ${tokenPrefix})`);
      }

      // For shared demo workspace, use the constant staff email
      const staffEmail = workspace.email === SHARED_WORKSPACE_EMAIL 
        ? DEMO_STAFF_EMAIL 
        : (workspace.staff_email || DEMO_STAFF_EMAIL);

      return new Response(JSON.stringify({
        success: true,
        email: staffEmail,
        temp_password: tempPassword,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // MODE: get-workspace - fetch existing workspace for resume
    if (mode === "get-workspace") {
      console.log("Get workspace mode for:", email);

      const { data: workspace } = await supabaseAdmin
        .from("demo_workspaces")
        .select("*")
        .eq("email", email.toLowerCase())
        .eq("status", "ready")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!workspace) {
        return new Response(JSON.stringify({ success: false, found: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        found: true,
        workspace_id: workspace.id,
        resort_id: workspace.resort_id,
        resort_code: workspace.resort_code,
        resort_name: workspace.resort_name,
        staff_email: workspace.staff_email,
        guest_room: workspace.guest_room,
        guest_last_name: workspace.guest_last_name,
        expires_at: workspace.expires_at,
        created_at: workspace.created_at,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // MODE: resend (legacy) - same as regenerate-credentials
    if (mode === "resend") {
      console.log("Resend mode (legacy) for:", email);
      
      // Check demo_workspaces first
      const { data: workspace } = await supabaseAdmin
        .from("demo_workspaces")
        .select("*")
        .eq("email", email.toLowerCase())
        .eq("status", "ready")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (workspace) {
        // Use new flow
        const rotated = await rotateCredentials(supabaseAdmin, workspace.id, workspace.resort_id, workspace.resort_code);
        
        const tokens = await generateLoginTokens(
          supabaseAdmin,
          workspace.id,
          workspace.resort_id,
          rotated.staffUserId,
          rotated.guestInfo.guestId
        );

        const staffLoginUrl = `${PRODUCTION_URL}/demo/login?token=${tokens.staffToken}`;
        const guestLoginUrl = `${PRODUCTION_URL}/demo/login?token=${tokens.guestToken}`;

        const emailResult = await sendDemoEmail({
          to: email,
          resortName: workspace.resort_name,
          resortCode: workspace.resort_code,
          staffIdentifier: rotated.staffIdentifier,
          tempPassword: rotated.tempPassword,
          guestInfo: rotated.guestInfo,
          staffToken: tokens.staffToken,
          guestToken: tokens.guestToken,
          isReminder: true,
        });

        return new Response(JSON.stringify({
          success: true,
          existing: true,
          workspace_id: workspace.id,
          tenant_id: workspace.resort_id,
          resort_code: workspace.resort_code,
          email: rotated.staffIdentifier,
          temp_password: rotated.tempPassword,
          staff_login_url: staffLoginUrl,
          staff_token: tokens.staffToken,
          guest_login: {
            guest_name: rotated.guestInfo.guestName,
            room_number: rotated.guestInfo.roomNumber,
            last_name: rotated.guestInfo.lastName,
            pin: rotated.guestInfo.pin,
            portal_url: guestLoginUrl,
          },
          guest_token: tokens.guestToken,
          email_sent: emailResult.sent,
          credentials_validated: rotated.validated,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fallback to old flow for legacy demos
      const { data: existingLead } = await supabaseAdmin
        .from("leads")
        .select("id")
        .eq("email", email.toLowerCase())
        .single();

      if (!existingLead) {
        return new Response(JSON.stringify({ success: false, error: "No demo found for this email" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: existingDemo } = await supabaseAdmin
        .from("demo_tenants")
        .select("id, tenant_id, expires_at")
        .eq("lead_id", existingLead.id)
        .eq("is_converted", false)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (!existingDemo) {
        return new Response(JSON.stringify({ success: false, error: "No active demo found. Please create a new demo." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: resort } = await supabaseAdmin
        .from("resorts")
        .select("code, name")
        .eq("id", existingDemo.tenant_id)
        .single();

      if (!resort) {
        return new Response(JSON.stringify({ success: false, error: "Demo resort not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create a workspace record for this legacy demo
      const { data: newWorkspace } = await supabaseAdmin
        .from("demo_workspaces")
        .insert({
          email: email.toLowerCase(),
          resort_name: resort.name,
          resort_id: existingDemo.tenant_id,
          resort_code: resort.code,
          status: "ready",
          expires_at: existingDemo.expires_at,
        })
        .select()
        .single();

      const tempPassword = generatePassword();
      
      // Find and reset admin password
      const { data: membership } = await supabaseAdmin
        .from("resort_memberships")
        .select("user_id")
        .eq("resort_id", existingDemo.tenant_id)
        .eq("resort_role", "RESORT_ADMIN")
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (!membership) {
        throw new Error("No admin found for this demo resort");
      }

      const { data: { user: existingUser } } = await supabaseAdmin.auth.admin.getUserById(membership.user_id);
      
      await supabaseAdmin.auth.admin.updateUserById(membership.user_id, { password: tempPassword });

      const staffIdentifier = existingUser?.email || email;

      // Validate credentials
      const validation = await validateStaffCredentials(supabaseAdmin, staffIdentifier, tempPassword);

      await refreshDemoData(supabaseAdmin, existingDemo.tenant_id);

      // Get or create guest PIN
      const { data: demoGuest } = await supabaseAdmin
        .from("guests")
        .select("id, full_name, room_number")
        .eq("resort_id", existingDemo.tenant_id)
        .eq("room_number", "201")
        .eq("portal_enabled", true)
        .single();

      let guestInfo = { guestId: "", guestName: "Demo Guest", roomNumber: "101", lastName: "Guest", pin: "0000" };

      if (demoGuest) {
        const newPin = generatePin();
        const pinHash = await hashPin(newPin);
        await supabaseAdmin.from("guests").update({
          portal_pin_hash: pinHash,
          portal_pin_last4: newPin.slice(-4),
          portal_pin_set_at: new Date().toISOString(),
        }).eq("id", demoGuest.id);
        
        guestInfo.pin = newPin;
        guestInfo.guestId = demoGuest.id;
        const nameParts = demoGuest.full_name.split(" ");
        guestInfo.guestName = demoGuest.full_name;
        guestInfo.roomNumber = demoGuest.room_number;
        guestInfo.lastName = nameParts[nameParts.length - 1];
      }

      // Update workspace
      if (newWorkspace) {
        await supabaseAdmin.from("demo_workspaces").update({
          staff_user_id: membership.user_id,
          staff_email: staffIdentifier,
          guest_id: guestInfo.guestId || null,
          guest_room: guestInfo.roomNumber,
          guest_last_name: guestInfo.lastName,
        }).eq("id", newWorkspace.id);

        // Generate tokens
        const tokens = await generateLoginTokens(
          supabaseAdmin,
          newWorkspace.id,
          existingDemo.tenant_id,
          membership.user_id,
          guestInfo.guestId
        );

        const staffLoginUrl = `${PRODUCTION_URL}/demo/login?token=${tokens.staffToken}`;
        const guestLoginUrl = `${PRODUCTION_URL}/demo/login?token=${tokens.guestToken}`;

        const emailResult = await sendDemoEmail({
          to: email,
          resortName: resort.name,
          resortCode: resort.code,
          staffIdentifier,
          tempPassword,
          guestInfo,
          staffToken: tokens.staffToken,
          guestToken: tokens.guestToken,
          isReminder: true,
        });

        return new Response(JSON.stringify({
          success: true,
          existing: true,
          workspace_id: newWorkspace.id,
          tenant_id: existingDemo.tenant_id,
          resort_code: resort.code,
          email: staffIdentifier,
          temp_password: tempPassword,
          staff_login_url: staffLoginUrl,
          staff_token: tokens.staffToken,
          guest_login: {
            guest_name: guestInfo.guestName,
            room_number: guestInfo.roomNumber,
            last_name: guestInfo.lastName,
            pin: guestInfo.pin,
            portal_url: guestLoginUrl,
          },
          guest_token: tokens.guestToken,
          email_sent: emailResult.sent,
          credentials_validated: validation.valid,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fallback without tokens
      const staffLoginUrl = `${PRODUCTION_URL}/staff/auth?username=${encodeURIComponent(staffIdentifier)}`;
      const guestLoginUrl = `${PRODUCTION_URL}/resort/${resort.code}/guest/login?roomNumber=${encodeURIComponent(guestInfo.roomNumber)}&lastName=${encodeURIComponent(guestInfo.lastName)}`;

      const emailResult = await sendDemoEmail({
        to: email,
        resortName: resort.name,
        resortCode: resort.code,
        staffIdentifier,
        tempPassword,
        guestInfo,
        isReminder: true,
      });

      return new Response(JSON.stringify({
        success: true,
        existing: true,
        tenant_id: existingDemo.tenant_id,
        resort_code: resort.code,
        email: staffIdentifier,
        temp_password: tempPassword,
        staff_login_url: staffLoginUrl,
        guest_login: {
          guest_name: guestInfo.guestName,
          room_number: guestInfo.roomNumber,
          last_name: guestInfo.lastName,
          pin: guestInfo.pin,
          portal_url: guestLoginUrl,
        },
        email_sent: emailResult.sent,
        credentials_validated: validation.valid,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === PROVISION MODE (default) ===
    if (!resort_name) {
      return new Response(JSON.stringify({ success: false, error: "Resort name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Provision mode for:", email, resort_name, "departments:", departments);

    // Check for existing workspace first
    const { data: existingWorkspace } = await supabaseAdmin
      .from("demo_workspaces")
      .select("*")
      .eq("email", email.toLowerCase())
      .eq("status", "ready")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (existingWorkspace) {
      console.log("Existing workspace found - regenerating credentials");
      
      const rotated = await rotateCredentials(supabaseAdmin, existingWorkspace.id, existingWorkspace.resort_id, existingWorkspace.resort_code);
      
      const tokens = await generateLoginTokens(
        supabaseAdmin,
        existingWorkspace.id,
        existingWorkspace.resort_id,
        rotated.staffUserId,
        rotated.guestInfo.guestId
      );

      const staffLoginUrl = `${PRODUCTION_URL}/staff/demo-login?token=${tokens.staffToken}`;
      const guestLoginUrl = `${PRODUCTION_URL}/guest/demo-login?token=${tokens.guestToken}`;

      const emailResult = await sendDemoEmail({
        to: email,
        resortName: existingWorkspace.resort_name,
        resortCode: existingWorkspace.resort_code,
        staffIdentifier: rotated.staffIdentifier,
        tempPassword: rotated.tempPassword,
        guestInfo: rotated.guestInfo,
        staffToken: tokens.staffToken,
        guestToken: tokens.guestToken,
        isReminder: true,
      });

      return new Response(JSON.stringify({
        success: true,
        existing: true,
        workspace_id: existingWorkspace.id,
        tenant_id: existingWorkspace.resort_id,
        resort_code: existingWorkspace.resort_code,
        email: rotated.staffIdentifier,
        temp_password: rotated.tempPassword,
        staff_login_url: staffLoginUrl,
        staff_token: tokens.staffToken,
        guest_login: {
          guest_name: rotated.guestInfo.guestName,
          room_number: rotated.guestInfo.roomNumber,
          last_name: rotated.guestInfo.lastName,
          pin: rotated.guestInfo.pin,
          portal_url: guestLoginUrl,
        },
        guest_token: tokens.guestToken,
        email_sent: emailResult.sent,
        credentials_validated: rotated.validated,
        message: "You already have an active demo - fresh credentials generated!",
        expires_at: existingWorkspace.expires_at,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limiting check
    const emailDomain = email.split("@")[1];
    const { data: rateLimit } = await supabaseAdmin
      .from("demo_rate_limits")
      .select("*")
      .eq("email_domain", emailDomain)
      .single();

    if (rateLimit) {
      const lastAttempt = new Date(rateLimit.last_attempt_at);
      const hoursSince = (Date.now() - lastAttempt.getTime()) / (1000 * 60 * 60);

      if (hoursSince < 24 && rateLimit.attempts >= 3) {
        return new Response(JSON.stringify({ success: false, error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabaseAdmin
        .from("demo_rate_limits")
        .update({ attempts: hoursSince < 24 ? rateLimit.attempts + 1 : 1, last_attempt_at: new Date().toISOString() })
        .eq("id", rateLimit.id);
    } else {
      await supabaseAdmin.from("demo_rate_limits").insert({ email_domain: emailDomain });
    }

    // Create workspace record first (status: creating)
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from("demo_workspaces")
      .insert({
        email: email.toLowerCase(),
        resort_name,
        timezone: timezone || "UTC",
        rooms_range,
        departments: departments || [],
        status: "creating",
      })
      .select()
      .single();

    if (workspaceError) {
      throw workspaceError;
    }

    try {
      // Check for existing lead
      let leadId: string;
      const { data: existingLead } = await supabaseAdmin
        .from("leads")
        .select("id, status")
        .eq("email", email.toLowerCase())
        .single();

      if (existingLead) {
        leadId = existingLead.id;
        
        // Check for existing demo tenant
        const { data: existingDemo } = await supabaseAdmin
          .from("demo_tenants")
          .select("id, tenant_id, expires_at")
          .eq("lead_id", leadId)
          .eq("is_converted", false)
          .gt("expires_at", new Date().toISOString())
          .single();

        if (existingDemo) {
          console.log("Existing demo tenant found");
          
          const { data: existingResort } = await supabaseAdmin
            .from("resorts")
            .select("code, name")
            .eq("id", existingDemo.tenant_id)
            .single();

          // Update workspace to point to existing resort
          await supabaseAdmin.from("demo_workspaces").update({
            resort_id: existingDemo.tenant_id,
            resort_code: existingResort?.code,
            resort_name: existingResort?.name || resort_name,
            expires_at: existingDemo.expires_at,
          }).eq("id", workspace.id);

          // Find admin and rotate credentials
          const { data: membership } = await supabaseAdmin
            .from("resort_memberships")
            .select("user_id")
            .eq("resort_id", existingDemo.tenant_id)
            .eq("resort_role", "RESORT_ADMIN")
            .order("created_at", { ascending: true })
            .limit(1)
            .single();

          if (!membership) {
            throw new Error("No admin found for existing demo");
          }

          const tempPassword = generatePassword();
          const { data: { user: existingUser } } = await supabaseAdmin.auth.admin.getUserById(membership.user_id);
          await supabaseAdmin.auth.admin.updateUserById(membership.user_id, { password: tempPassword });
          
          const staffIdentifier = existingUser?.email || email;

          // Validate credentials
          const validation = await validateStaffCredentials(supabaseAdmin, staffIdentifier, tempPassword);

          await refreshDemoData(supabaseAdmin, existingDemo.tenant_id);

          // Get demo guest
          const { data: demoGuest } = await supabaseAdmin
            .from("guests")
            .select("id, full_name, room_number")
            .eq("resort_id", existingDemo.tenant_id)
            .eq("room_number", "201")
            .eq("portal_enabled", true)
            .single();

          let guestInfo = { guestId: "", guestName: "Demo Guest", roomNumber: "101", lastName: "Guest", pin: "0000" };

          if (demoGuest) {
            const newPin = generatePin();
            const pinHash = await hashPin(newPin);
            await supabaseAdmin.from("guests").update({
              portal_pin_hash: pinHash,
              portal_pin_last4: newPin,
              portal_pin_set_at: new Date().toISOString(),
            }).eq("id", demoGuest.id);
            
            guestInfo.pin = newPin;
            guestInfo.guestId = demoGuest.id;
            const nameParts = demoGuest.full_name.split(" ");
            guestInfo.guestName = demoGuest.full_name;
            guestInfo.roomNumber = demoGuest.room_number;
            guestInfo.lastName = nameParts[nameParts.length - 1];
          }

          // Update workspace
          await supabaseAdmin.from("demo_workspaces").update({
            staff_user_id: membership.user_id,
            staff_email: staffIdentifier,
            guest_id: guestInfo.guestId || null,
            guest_room: guestInfo.roomNumber,
            guest_last_name: guestInfo.lastName,
            status: "ready",
            seeded_at: new Date().toISOString(),
          }).eq("id", workspace.id);

          // Generate tokens
          const tokens = await generateLoginTokens(
            supabaseAdmin,
            workspace.id,
            existingDemo.tenant_id,
            membership.user_id,
            guestInfo.guestId
          );

          const staffLoginUrl = `${PRODUCTION_URL}/staff/demo-login?token=${tokens.staffToken}`;
          const guestLoginUrl = `${PRODUCTION_URL}/guest/demo-login?token=${tokens.guestToken}`;

          const emailResult = await sendDemoEmail({
            to: email,
            resortName: existingResort?.name || resort_name,
            resortCode: existingResort?.code || "",
            staffIdentifier,
            tempPassword,
            guestInfo,
            staffToken: tokens.staffToken,
            guestToken: tokens.guestToken,
            isReminder: true,
          });

          return new Response(JSON.stringify({
            success: true,
            existing: true,
            workspace_id: workspace.id,
            tenant_id: existingDemo.tenant_id,
            resort_code: existingResort?.code,
            email: staffIdentifier,
            temp_password: tempPassword,
            staff_login_url: staffLoginUrl,
            staff_token: tokens.staffToken,
            guest_login: {
              guest_name: guestInfo.guestName,
              room_number: guestInfo.roomNumber,
              last_name: guestInfo.lastName,
              pin: guestInfo.pin,
              portal_url: guestLoginUrl,
            },
            guest_token: tokens.guestToken,
            email_sent: emailResult.sent,
            credentials_validated: validation.valid,
            message: "You already have an active demo - fresh credentials generated!",
            expires_at: existingDemo.expires_at,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await supabaseAdmin
          .from("leads")
          .update({ resort_name, timezone, rooms_range, departments, status: "sandbox_created", updated_at: new Date().toISOString() })
          .eq("id", leadId);
      } else {
        const { data: newLead, error: leadError } = await supabaseAdmin
          .from("leads")
          .insert({
            email: email.toLowerCase(),
            resort_name,
            timezone,
            rooms_range,
            departments,
            status: "sandbox_created",
            lead_score: 10,
          })
          .select()
          .single();

        if (leadError) throw leadError;
        leadId = newLead.id;
      }

      // Generate unique resort code
      const baseCode = resort_name.replace(/[^a-zA-Z]/g, "").substring(0, 4).toUpperCase() || "DEMO";
      const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
      const resortCode = `${baseCode}${randomSuffix}`;

      // Create the demo resort
      const { data: resort, error: resortError } = await supabaseAdmin
        .from("resorts")
        .insert({
          name: resort_name,
          code: resortCode,
          timezone: timezone || "UTC",
          currency: "USD",
          status: "ACTIVE",
          is_demo: true,
          subscription_tier: "ESSENTIAL",
          onboarding_status: "NOT_STARTED",
        })
        .select()
        .single();

      if (resortError) throw resortError;
      console.log("Resort created:", resort.id, "code:", resortCode);

      // Create demo tenant record
      const expiresAt = addDays(new Date(), 14);
      await supabaseAdmin.from("demo_tenants").insert({
        lead_id: leadId,
        tenant_id: resort.id,
        expires_at: expiresAt.toISOString(),
      });

      // Generate admin credentials
      const tempPassword = generatePassword();
      const emailParts = email.split("@");
      const demoEmail = `${emailParts[0]}+${resortCode.toLowerCase()}@${emailParts[1]}`;
      const username = emailParts[0].toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 20) + ".demo";

      let userId: string;
      let staffIdentifier: string;

      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: demoEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: "Demo Admin", must_reset_password: false },
      });

      if (authError) {
        console.error("Auth user creation error:", authError);
        const { data: fallbackUser, error: fallbackError } = await supabaseAdmin.auth.admin.createUser({
          email: email.toLowerCase(),
          password: tempPassword,
          email_confirm: true,
          user_metadata: { full_name: "Demo Admin", must_reset_password: false },
        });

        if (fallbackError) {
          if (fallbackError.message.includes("already been registered")) {
            const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
            const existingUser = existingUsers?.users?.find((u: any) => u.email === email.toLowerCase());
            
            if (existingUser) {
              userId = existingUser.id;
              staffIdentifier = email;
              
              // Reset password for existing user
              await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { password: tempPassword });
              
              await supabaseAdmin.from("resort_memberships").insert({
                user_id: existingUser.id,
                resort_id: resort.id,
                resort_role: "RESORT_ADMIN",
              });
            } else {
              throw fallbackError;
            }
          } else {
            throw fallbackError;
          }
        } else {
          userId = fallbackUser.user.id;
          staffIdentifier = email;

          await supabaseAdmin.from("profiles").upsert({
            id: userId,
            username,
            full_name: "Demo Admin",
            global_role: "STANDARD",
          });

          await supabaseAdmin.from("resort_memberships").insert({
            user_id: userId,
            resort_id: resort.id,
            resort_role: "RESORT_ADMIN",
          });
        }
      } else {
        userId = authUser.user.id;
        staffIdentifier = demoEmail;

        await supabaseAdmin.from("profiles").upsert({
          id: userId,
          username,
          full_name: "Demo Admin",
          global_role: "STANDARD",
        });

        await supabaseAdmin.from("resort_memberships").insert({
          user_id: userId,
          resort_id: resort.id,
          resort_role: "RESORT_ADMIN",
        });
      }

      console.log("Admin user setup complete:", userId, "identifier:", staffIdentifier);

      // Validate credentials work
      const validation = await validateStaffCredentials(supabaseAdmin, staffIdentifier, tempPassword);
      console.log("Credential validation:", validation);

      // Seed demo data
      const demoGuestInfo = await seedDemoData(supabaseAdmin, resort.id, departments || [], resortCode);
      console.log("Demo data seeded, guest info:", demoGuestInfo);

      // Update workspace
      await supabaseAdmin.from("demo_workspaces").update({
        resort_id: resort.id,
        resort_code: resortCode,
        staff_user_id: userId,
        staff_email: staffIdentifier,
        guest_id: demoGuestInfo.guestId || null,
        guest_room: demoGuestInfo.roomNumber,
        guest_last_name: demoGuestInfo.lastName,
        status: "ready",
        seeded_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      }).eq("id", workspace.id);

      // Generate login tokens
      const tokens = await generateLoginTokens(
        supabaseAdmin,
        workspace.id,
        resort.id,
        userId,
        demoGuestInfo.guestId || ""
      );

      const staffLoginUrl = `${PRODUCTION_URL}/staff/demo-login?token=${tokens.staffToken}`;
      const guestLoginUrl = `${PRODUCTION_URL}/guest/demo-login?token=${tokens.guestToken}`;

      // Log event
      await supabaseAdmin.from("lead_events").insert({
        lead_id: leadId,
        event_type: "demo_created",
        meta: { resort_id: resort.id, user_id: userId, workspace_id: workspace.id },
      });

      // Send welcome email
      const emailResult = await sendDemoEmail({
        to: email,
        resortName: resort_name,
        resortCode: resortCode,
        staffIdentifier,
        tempPassword,
        guestInfo: demoGuestInfo,
        staffToken: tokens.staffToken,
        guestToken: tokens.guestToken,
        isReminder: false,
      });

      console.log("Demo provisioning complete");
      
      return new Response(JSON.stringify({
        success: true,
        workspace_id: workspace.id,
        tenant_id: resort.id,
        resort_code: resortCode,
        email: staffIdentifier,
        temp_password: tempPassword,
        staff_login_url: staffLoginUrl,
        staff_token: tokens.staffToken,
        guest_login: {
          guest_name: demoGuestInfo.guestName,
          room_number: demoGuestInfo.roomNumber,
          last_name: demoGuestInfo.lastName,
          pin: demoGuestInfo.pin,
          portal_url: guestLoginUrl,
        },
        guest_token: tokens.guestToken,
        email_sent: emailResult.sent,
        credentials_validated: validation.valid,
        expires_at: expiresAt.toISOString(),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (provisionError: any) {
      console.error("Provision error:", provisionError);
      
      // Update workspace with error
      await supabaseAdmin.from("demo_workspaces").update({
        status: "failed",
        last_error: provisionError?.message || "Unknown error",
      }).eq("id", workspace.id);

      throw provisionError;
    }

  } catch (error: any) {
    console.error("Provision demo error:", error);
    return new Response(JSON.stringify({ success: false, error: error?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function seedDemoData(supabase: any, resortId: string, departments: string[], resortCode: string): Promise<{ guestId: string; guestName: string; roomNumber: string; lastName: string; pin: string }> {
  const today = new Date();

  const deptMap: Record<string, string[]> = {
    dive: ["DIVE"],
    watersports: ["WATERSPORT"],
    spa: ["SPA"],
    excursions: ["EXCURSION"],
  };

  const activitiesToSeed = departments.length === 0 
    ? DEMO_ACTIVITIES 
    : DEMO_ACTIVITIES.filter((a) => departments.some((dept) => deptMap[dept]?.includes(a.category)));

  const finalActivities = activitiesToSeed.length > 0 ? activitiesToSeed : DEMO_ACTIVITIES.slice(0, 3);

  console.log("Seeding activities:", finalActivities.map(a => a.name));

  const { data: activities, error: actError } = await supabase
    .from("activities")
    .insert(finalActivities.map((a) => ({ ...a, resort_id: resortId })))
    .select();

  if (actError) console.error("Error creating activities:", actError);

  let allSessions: any[] = [];
  if (activities?.length) {
    const sessions: any[] = [];
    for (let day = 0; day <= 14; day++) {
      const sessionDate = formatDate(addDays(today, day));
      activities.forEach((activity: any) => {
        // Get activity-specific time slots
        const timeSlots = getActivityTimeSlots(activity.name, activity.category);
        
        timeSlots.forEach((slot) => {
          // Calculate end time based on duration
          const [startHour, startMin] = slot.time.split(":").map(Number);
          const totalMinutes = startHour * 60 + startMin + activity.duration_minutes;
          const endHour = Math.floor(totalMinutes / 60);
          const endMin = totalMinutes % 60;
          const endTime = `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`;
          
          sessions.push({
            resort_id: resortId,
            activity_id: activity.id,
            date: sessionDate,
            start_time: slot.time,
            end_time: endTime,
            capacity: activity.default_max_capacity,
            status: "SCHEDULED",
          });
        });
      });
    }
    const { data: createdSessions, error: sessError } = await supabase.from("activity_sessions").insert(sessions).select();
    if (sessError) console.error("Error creating sessions:", sessError);
    else {
      console.log("Created", sessions.length, "activity sessions with realistic times");
      allSessions = createdSessions || [];
    }
  }

  const shouldSeedDining = departments.length === 0 || departments.includes("dining");
  let allSlots: any[] = [];
  
  if (shouldSeedDining) {
    console.log("Seeding restaurants and time slots");
    const { data: restaurants, error: restError } = await supabase
      .from("restaurants")
      .insert(DEMO_RESTAURANTS.map((r) => ({ ...r, resort_id: resortId })))
      .select();

    if (restError) console.error("Error creating restaurants:", restError);

    if (restaurants?.length) {
      const slots: any[] = [];
      for (let day = 0; day <= 14; day++) {
        const slotDate = formatDate(addDays(today, day));
        restaurants.forEach((restaurant: any) => {
          slots.push({ resort_id: resortId, restaurant_id: restaurant.id, date: slotDate, start_time: "07:00", end_time: "10:00", meal_period: "BREAKFAST", capacity: restaurant.total_capacity, status: "OPEN" });
          slots.push({ resort_id: resortId, restaurant_id: restaurant.id, date: slotDate, start_time: "12:00", end_time: "14:30", meal_period: "LUNCH", capacity: Math.floor(restaurant.total_capacity * 0.7), status: "OPEN" });
          slots.push({ resort_id: resortId, restaurant_id: restaurant.id, date: slotDate, start_time: "19:00", end_time: "20:30", meal_period: "DINNER", capacity: Math.floor(restaurant.total_capacity / 2), status: "OPEN" });
          slots.push({ resort_id: resortId, restaurant_id: restaurant.id, date: slotDate, start_time: "20:30", end_time: "22:00", meal_period: "DINNER", capacity: Math.floor(restaurant.total_capacity / 2), status: "OPEN" });
        });
      }
      const { data: createdSlots, error: slotError } = await supabase.from("restaurant_time_slots").insert(slots).select();
      if (slotError) console.error("Error creating restaurant slots:", slotError);
      else {
        console.log("Created", slots.length, "restaurant time slots");
        allSlots = createdSlots || [];
      }
    }
  }

  const guestData = DEMO_GUESTS.map((g) => ({
    resort_id: resortId,
    full_name: g.full_name,
    room_number: g.room_number,
    nationality: g.nationality,
    email: g.email,
    check_in_date: formatDate(addDays(today, g.daysFromNow)),
    check_out_date: formatDate(addDays(today, g.daysFromNow + g.stayLength)),
    portal_enabled: true,
  }));

  const { data: guests, error: guestError } = await supabase.from("guests").insert(guestData).select();
  
  if (guestError) console.error("Error creating guests:", guestError);
  else console.log("Created", guests?.length, "demo guests");

  const demoGuest = guests?.find((g: any) => g.room_number === "201") || guests?.[0];
  const pin = generatePin();
  
  if (demoGuest) {
    const pinHash = await hashPin(pin);
    await supabase.from("guests").update({
      portal_pin_hash: pinHash,
      portal_pin_last4: pin,
      portal_pin_set_at: new Date().toISOString(),
    }).eq("id", demoGuest.id);
  }

  // Create sample activity bookings - prioritize room 201 guest with category diversity
  if (guests?.length && allSessions?.length) {
    const todayStr = formatDate(today);
    const futureSessions = allSessions.filter((s: any) => s.date >= todayStr);
    
    // Prioritize room 201 (demo portal guest) for bookings
    const demoPortalGuest = guests.find((g: any) => g.room_number === "201") || guests[0];
    
    // Get activity details for category-aware selection
    const { data: activityDetails } = await supabase
      .from("activities")
      .select("id, category")
      .eq("resort_id", resortId);
    
    const activityCategoryMap = new Map<string, string>();
    activityDetails?.forEach((a: any) => activityCategoryMap.set(a.id, a.category));
    
    // Pick sessions from different categories for variety
    const categoryPicks = new Map<string, any>();
    const extraSessions: any[] = [];
    
    for (const session of futureSessions) {
      const cat = activityCategoryMap.get(session.activity_id);
      if (!cat) continue;
      
      if (!categoryPicks.has(cat)) {
        categoryPicks.set(cat, session);
      } else if (extraSessions.length < 2) {
        extraSessions.push(session);
      }
    }
    
    // Combine for 5 total bookings on demo portal guest
    const sessionsForDemoGuest = [...categoryPicks.values(), ...extraSessions].slice(0, 5);
    const activityBookings: any[] = [];
    
    // Create 4 CONFIRMED + 1 PENDING for demo portal guest
    for (let i = 0; i < sessionsForDemoGuest.length; i++) {
      const session = sessionsForDemoGuest[i];
      const isLastOne = i === sessionsForDemoGuest.length - 1;
      
      activityBookings.push({
        resort_id: resortId,
        session_id: session.id,
        guest_id: demoPortalGuest.id,
        room_number: demoPortalGuest.room_number,
        num_adults: 2,
        num_children: 0,
        status: isLastOne ? "PENDING" : "CONFIRMED",
        source: "STAFF_FRONT_DESK",
        origin: "seed",
        notes: SAMPLE_BOOKING_NOTES[i % SAMPLE_BOOKING_NOTES.length],
        price_per_person: 50,
        total_amount: 100,
      });
    }
    
    // Add a few bookings for other guests too (for staff dashboard variety)
    const otherGuests = guests.filter((g: any) => g.room_number !== demoPortalGuest.room_number);
    for (let i = 0; i < Math.min(3, futureSessions.length, otherGuests.length); i++) {
      const session = futureSessions[(i + 5) % futureSessions.length];
      const guest = otherGuests[i % otherGuests.length];
      
      activityBookings.push({
        resort_id: resortId,
        session_id: session.id,
        guest_id: guest.id,
        room_number: guest.room_number,
        num_adults: Math.floor(Math.random() * 2) + 1,
        num_children: Math.floor(Math.random() * 2),
        status: "CONFIRMED",
        source: "STAFF_FRONT_DESK",
        origin: "seed",
        notes: SAMPLE_BOOKING_NOTES[(i + 5) % SAMPLE_BOOKING_NOTES.length],
        price_per_person: 50,
        total_amount: 50 * (Math.floor(Math.random() * 2) + 1),
      });
    }

    if (activityBookings.length) {
      const { error: bookingError } = await supabase.from("activity_bookings").insert(activityBookings);
      if (bookingError) console.error("Error creating activity bookings:", bookingError);
      else console.log("Created", activityBookings.length, "sample activity bookings (5 for demo portal guest)");
    }
  }

  // Create sample restaurant reservations - prioritize room 201 guest
  if (guests?.length && allSlots?.length) {
    const todayStr = formatDate(today);
    const futureSlots = allSlots.filter((s: any) => s.date >= todayStr);
    
    // Prioritize room 201 (demo portal guest)
    const demoPortalGuest = guests.find((g: any) => g.room_number === "201") || guests[0];
    
    // Get restaurant variety
    const restaurantPicks = new Map<string, any>();
    for (const slot of futureSlots) {
      const key = `${slot.restaurant_id}-${restaurantPicks.size}`;
      if (!restaurantPicks.has(slot.restaurant_id)) {
        restaurantPicks.set(slot.restaurant_id, slot);
      }
      if (restaurantPicks.size >= 3) break;
    }
    
    const slotsForDemoGuest = [...restaurantPicks.values()].slice(0, 3);
    const reservations: any[] = [];
    const specialRequests = ["Anniversary dinner - please arrange flowers", "Window table if possible", null];
    
    // Create 3 reservations for demo portal guest
    for (let i = 0; i < slotsForDemoGuest.length; i++) {
      const slot = slotsForDemoGuest[i];
      
      reservations.push({
        resort_id: resortId,
        restaurant_slot_id: slot.id,
        guest_id: demoPortalGuest.id,
        room_number: demoPortalGuest.room_number,
        num_adults: 2,
        num_children: 0,
        status: "CONFIRMED",
        source: "STAFF_FRONT_DESK",
        origin: "seed",
        special_requests: specialRequests[i],
      });
    }
    
    // Add a few for other guests (staff dashboard variety)
    const otherGuests = guests.filter((g: any) => g.room_number !== demoPortalGuest.room_number);
    for (let i = 0; i < Math.min(4, futureSlots.length, otherGuests.length); i++) {
      const slot = futureSlots[(i + 3) % futureSlots.length];
      const guest = otherGuests[i % otherGuests.length];
      
      reservations.push({
        resort_id: resortId,
        restaurant_slot_id: slot.id,
        guest_id: guest.id,
        room_number: guest.room_number,
        num_adults: Math.floor(Math.random() * 3) + 1,
        num_children: Math.floor(Math.random() * 2),
        status: "CONFIRMED",
        source: "STAFF_FRONT_DESK",
        origin: "seed",
        special_requests: null,
      });
    }

    if (reservations.length) {
      const { error: resError } = await supabase.from("restaurant_reservations").insert(reservations);
      if (resError) console.error("Error creating restaurant reservations:", resError);
      else console.log("Created", reservations.length, "sample restaurant reservations (3 for demo portal guest)");
    }
  }

  if (demoGuest) {
    const nameParts = demoGuest.full_name.split(" ");
    const lastName = nameParts[nameParts.length - 1];

    return {
      guestId: demoGuest.id,
      guestName: demoGuest.full_name,
      roomNumber: demoGuest.room_number,
      lastName: lastName,
      pin: pin,
    };
  }

  return {
    guestId: "",
    guestName: "Demo Guest",
    roomNumber: "101",
    lastName: "Guest",
    pin: pin,
  };
}