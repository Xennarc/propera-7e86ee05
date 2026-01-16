-- Update existing activities in Demo Resort with rich content
-- Then delete old sessions and let the demo-reset function regenerate them

-- 1. Update existing activities with enhanced descriptions
UPDATE activities SET
  description = 'Greet the day with a soul-nourishing yoga session as the first golden rays paint the ocean. Our certified instructor guides you through gentle flows on the pristine beach.',
  short_description = 'Beachfront sunrise yoga session',
  full_description = 'Begin your morning in paradise with our signature Sunrise Yoga experience. As the sky transforms from deep purple to brilliant orange, find your center on our pristine white sand beach.',
  highlights = '["Beachfront setting with panoramic ocean views", "All levels welcome", "Fresh coconut water & fruit included", "Complimentary yoga mat & towel"]'::jsonb,
  includes = 'Yoga mat, towel, fresh coconut water, tropical fruit platter',
  default_price_per_person = 35
WHERE name = 'Sunrise Yoga' AND resort_id IN (SELECT id FROM resorts WHERE code = 'DEMO');

UPDATE activities SET
  description = 'Melt away tension in our overwater spa pavilion with a therapeutic deep tissue massage. Expert therapists use traditional techniques combined with aromatic local oils.',
  short_description = '60-minute therapeutic massage',
  full_description = 'Surrender to complete relaxation in our stunning overwater spa pavilion, where floor-to-ceiling windows frame endless ocean views.',
  highlights = '["Private overwater pavilion with glass floor panels", "Choice of aromatherapy oils", "Targets deep muscle tension", "Includes herbal tea"]'::jsonb,
  includes = '60-min massage, choice of oils, warm compress, herbal tea, robe & slippers'
WHERE name = 'Deep Tissue Massage' AND resort_id IN (SELECT id FROM resorts WHERE code = 'DEMO');

UPDATE activities SET
  description = 'Discover an underwater wonderland just steps from shore. Our pristine house reef hosts over 200 species of tropical fish, graceful sea turtles, and stunning coral formations.',
  short_description = 'Guided snorkel on pristine house reef',
  full_description = 'Step off our jetty and into a kaleidoscope of marine life. Our resident marine biologist leads small groups along the reef, identifying species and explaining the ecosystem.',
  highlights = '["200+ fish species & regular turtle sightings", "Led by resident marine biologist", "Premium equipment included", "Underwater camera rental available"]'::jsonb,
  includes = 'Premium mask, snorkel & fins, reef-safe sunscreen, bottled water, fish ID card',
  default_price_per_person = 55
WHERE name = 'House Reef Snorkel' AND resort_id IN (SELECT id FROM resorts WHERE code = 'DEMO');

UPDATE activities SET
  description = 'Set sail at golden hour aboard a traditional Maldivian dhoni as pods of spinner dolphins leap and play around the boat. Toast the spectacular sunset with champagne.',
  short_description = 'Champagne sunset & dolphin watching',
  full_description = 'Board our traditional wooden dhoni as the late afternoon light turns golden. Cruise to known dolphin gathering spots where pods of up to 100 spinner dolphins swim alongside.',
  highlights = '["Guaranteed dolphin sighting*", "Champagne & gourmet canapés", "Traditional dhoni experience", "Prime photography opportunity"]'::jsonb,
  includes = 'Champagne, canapés, soft drinks, sunset photography tips, cozy blankets',
  default_price_per_person = 95
WHERE name = 'Sunset Dolphin Cruise' AND resort_id IN (SELECT id FROM resorts WHERE code = 'DEMO');

UPDATE activities SET
  description = 'Experience authentic Maldivian culture on a traditional night fishing trip. Learn line-fishing techniques passed down through generations.',
  short_description = 'Traditional Maldivian fishing',
  full_description = 'Depart at dusk aboard a traditional dhoni, cruising to productive fishing grounds as stars emerge overhead. Common catches include red snapper and grouper.',
  highlights = '["Learn traditional fishing techniques", "Keep your catch - we will cook it!", "Stargazing opportunity", "Authentic local experience"]'::jsonb,
  includes = 'Fishing equipment, bait, refreshments, crew assistance, catch preparation next day'
WHERE name = 'Night Fishing' AND resort_id IN (SELECT id FROM resorts WHERE code = 'DEMO');

UPDATE activities SET
  description = 'Take your first breath underwater and discover the magic of scuba diving. No experience needed - our PADI instructors guide you through every moment.',
  short_description = 'First-time scuba experience',
  full_description = 'Your underwater journey begins in our dive center with theory and pool training. Once confident, transfer to our house reef for a guided dive to 10-12 meters.',
  highlights = '["No prior experience needed", "Pool training + open water dive", "Maximum 2 guests per instructor", "Underwater photos available"]'::jsonb,
  includes = 'Full scuba equipment, pool training, 1 ocean dive, instructor, dive log book',
  default_price_per_person = 175
WHERE name = 'Intro Dive' AND resort_id IN (SELECT id FROM resorts WHERE code = 'DEMO');

UPDATE activities SET
  description = 'Certified divers explore world-class sites featuring manta rays, reef sharks, and vibrant coral walls. Our expert dive masters know where the big stuff hides.',
  short_description = '2-tank dive for certified divers',
  full_description = 'Board our fully-equipped dive dhoni for a morning of spectacular diving. Each dive explores different ecosystems from coral-covered thilas to dramatic channel drifts.',
  highlights = '["Manta rays, reef sharks & turtles", "2 dives at premium sites", "Nitrox available", "Refreshments between dives"]'::jsonb,
  includes = 'Full equipment, 2 dives, boat transfer, dive guide, refreshments, Nitrox (if certified)',
  default_price_per_person = 220
WHERE name = 'Advanced Reef Dive' AND resort_id IN (SELECT id FROM resorts WHERE code = 'DEMO');

UPDATE activities SET
  description = 'Paddle through crystal-clear lagoon waters at your own pace. Explore hidden sandbars, spot baby reef sharks in the shallows, and discover secret beaches.',
  short_description = 'Self-guided lagoon kayaking',
  full_description = 'Collect your kayak from our water sports center and set off to explore our stunning lagoon at your leisure.',
  highlights = '["Explore at your own pace", "Spot baby reef sharks & stingrays", "Access hidden sandbars", "Waterproof map included"]'::jsonb,
  includes = 'Kayak, paddle, life jacket, waterproof map, dry bag, bottled water',
  default_price_per_person = 45
WHERE name = 'Kayak Adventure' AND resort_id IN (SELECT id FROM resorts WHERE code = 'DEMO');

-- 2. Delete all existing activity sessions for Demo Resort (will be regenerated by demo-reset with correct times)
DELETE FROM activity_bookings WHERE resort_id IN (SELECT id FROM resorts WHERE code = 'DEMO');
DELETE FROM activity_sessions WHERE resort_id IN (SELECT id FROM resorts WHERE code = 'DEMO');