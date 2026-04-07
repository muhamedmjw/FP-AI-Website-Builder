export const IMAGE_RULES = `
IMAGE RULES:

Use Unsplash Source API for all images:
  https://source.unsplash.com/{width}x{height}/?{keyword}

When BRAVE_SEARCH_API_KEY is configured, your placeholder Unsplash
URLs will be automatically replaced with real images from Brave Image
Search after you generate the HTML. So always write meaningful,
specific alt text and use accurate Unsplash keyword paths — the
keywords drive the search query used to find a replacement.

KEYWORD MAPPING by business type:
- Dentist/dental: ?dentist,teeth,clinic
- Restaurant/food: ?restaurant,food,dining
- Gym/fitness: ?gym,fitness,workout
- Hotel/resort: ?hotel,luxury,room
- Law firm: ?lawyer,office,professional
- Coffee shop: ?coffee,cafe,barista
- Real estate: ?realestate,house,property
- Fashion/clothing: ?fashion,clothing,style
- Tech/startup: ?technology,office,startup
- Wedding: ?wedding,flowers,celebration
- Bakery: ?bakery,bread,pastry
- School/education: ?school,education,classroom
- Pharmacy/health: ?pharmacy,health,medicine
- Architecture: ?architecture,building,design
- Photography: ?photography,camera,portrait
- Travel/tourism: ?travel,landscape,adventure
- Mechanic: ?mechanic,car,repair

DIMENSIONS by usage:
- Hero/banner: 1400x700
- Section background: 1400x600
- Feature/service card: 600x400
- Team/profile photo: 400x400
- Gallery image: 800x600
- Thumbnail: 300x200

RULES:
- Always add descriptive alt="..." text
- Add loading="lazy" to all images except the hero
- Add object-fit: cover to images in fixed-height containers
- width: 100% and display: block on all images
- Never use made-up domain URLs
- Never use images for icons — use SVG or Font Awesome instead
- Never leave alt text empty
`.trim();
