// Specific keyword-to-image mappings for distinct dishes
const SPECIFIC_DISH_IMAGES: { keywords: string[]; url: string }[] = [
  // Breakfast items
  { keywords: ['idly', 'idli'], url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=200&h=200&fit=crop&auto=format' },
  { keywords: ['dosa', 'dosai'], url: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=200&h=200&fit=crop&auto=format' },
  { keywords: ['pongal'], url: 'https://images.unsplash.com/photo-1516714435131-44d6b64dc6a2?w=200&h=200&fit=crop&auto=format' },
  { keywords: ['poori', 'puri'], url: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=200&h=200&fit=crop&auto=format' },
  { keywords: ['vada', 'vadai'], url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=200&h=200&fit=crop&auto=format' },
  { keywords: ['upma', 'rava'], url: 'https://images.unsplash.com/photo-1630409351217-bc4fa6422075?w=200&h=200&fit=crop&auto=format' },
  { keywords: ['puttu', 'appam'], url: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=200&h=200&fit=crop&auto=format' },
  { keywords: ['uttapam', 'uthoppam'], url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=200&h=200&fit=crop&auto=format' },
  { keywords: ['bhature', 'chole'], url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=200&h=200&fit=crop&auto=format' },
  { keywords: ['sandwich', 'toast'], url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=200&h=200&fit=crop&auto=format' },

  // Biryanis & Rice Dishes
  { keywords: ['chicken biryani', 'chicken briyani'], url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=200&h=200&fit=crop&auto=format' },
  { keywords: ['mutton biryani', 'mutton briyani'], url: 'https://images.unsplash.com/photo-1545247181-516773cae754?w=200&h=200&fit=crop&auto=format' },
  { keywords: ['veg biryani', 'vegetable biryani', 'dum biryani', 'pulao', 'pulav'], url: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=200&h=200&fit=crop&auto=format' },
  { keywords: ['sambar'], url: 'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?w=200&h=200&fit=crop&auto=format' },
  { keywords: ['rasam'], url: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=200&h=200&fit=crop&auto=format' },
  { keywords: ['curd rice'], url: 'https://images.unsplash.com/photo-1596560548464-f010549b84d7?w=200&h=200&fit=crop&auto=format' },
  { keywords: ['lemon rice', 'tamarind rice', 'puliyogare'], url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=200&h=200&fit=crop&auto=format' },
  { keywords: ['fried rice', 'noodles'], url: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=200&h=200&fit=crop&auto=format' },
  { keywords: ['jeera rice', 'ghee rice'], url: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=200&h=200&fit=crop&auto=format' },

  // Breads & Rotis
  { keywords: ['naan', 'butter naan', 'garlic naan'], url: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=200&h=200&fit=crop&auto=format' },
  { keywords: ['chapati', 'roti', 'phulka'], url: 'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=200&h=200&fit=crop&auto=format' },
  { keywords: ['parotta', 'paratha', 'kothu'], url: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=200&h=200&fit=crop&auto=format' },

  // Curries & Side Dishes
  { keywords: ['paneer'], url: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=200&h=200&fit=crop&auto=format' },
  { keywords: ['dal', 'daal'], url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=200&h=200&fit=crop&auto=format' },
  { keywords: ['kurma', 'korma', 'gravy', 'curry'], url: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=200&h=200&fit=crop&auto=format' },
  { keywords: ['chicken 65', 'chicken fry', 'kebab', 'tikka'], url: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=200&h=200&fit=crop&auto=format' },
  { keywords: ['chicken'], url: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=200&h=200&fit=crop&auto=format' },
  { keywords: ['fish', 'prawn'], url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=200&h=200&fit=crop&auto=format' },
  { keywords: ['egg'], url: 'https://images.unsplash.com/photo-1582169505937-b9992bd01ed9?w=200&h=200&fit=crop&auto=format' },
  { keywords: ['salad'], url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&h=200&fit=crop&auto=format' },

  // Desserts
  { keywords: ['gulab', 'jamun'], url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=200&h=200&fit=crop&auto=format' },
  { keywords: ['rasgulla', 'rasmalai'], url: 'https://images.unsplash.com/photo-1599785209707-a456fc1337cc?w=200&h=200&fit=crop&auto=format' },
  { keywords: ['payasam', 'kheer'], url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=200&h=200&fit=crop&auto=format' },
  { keywords: ['halwa', 'halwaa'], url: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=200&h=200&fit=crop&auto=format' },
  { keywords: ['ice cream', 'kulfi'], url: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=200&h=200&fit=crop&auto=format' },
  { keywords: ['brownie', 'cake', 'pastry'], url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=200&h=200&fit=crop&auto=format' },
  { keywords: ['ladoo', 'laddu', 'jalebi'], url: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=200&h=200&fit=crop&auto=format' },

  // Beverages
  { keywords: ['coffee', 'cappuccino'], url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=200&h=200&fit=crop&auto=format' },
  { keywords: ['tea', 'chai'], url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=200&h=200&fit=crop&auto=format' },
  { keywords: ['juice'], url: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=200&h=200&fit=crop&auto=format' },
  { keywords: ['lassi', 'smoothie', 'shake'], url: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=200&h=200&fit=crop&auto=format' },
  { keywords: ['soda', 'drink', 'mocktail', 'cola'], url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=200&h=200&fit=crop&auto=format' },
  { keywords: ['buttermilk', 'chaas'], url: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=200&h=200&fit=crop&auto=format' },

  // Snacks
  { keywords: ['samosa'], url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=200&h=200&fit=crop&auto=format' },
  { keywords: ['fries', 'french fries'], url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=200&h=200&fit=crop&auto=format' },
  { keywords: ['cutlet', 'tikki'], url: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=200&h=200&fit=crop&auto=format' },
  { keywords: ['pizza'], url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200&h=200&fit=crop&auto=format' },
  { keywords: ['burger'], url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&h=200&fit=crop&auto=format' },
];

// Diverse category image pools for hashing when specific keywords don't match
const CATEGORY_POOLS: Record<string, string[]> = {
  breakfast: [
    'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=200&h=200&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=200&h=200&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1516714435131-44d6b64dc6a2?w=200&h=200&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=200&h=200&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1630409351217-bc4fa6422075?w=200&h=200&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=200&h=200&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=200&h=200&fit=crop&auto=format',
  ],
  main: [
    'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=200&h=200&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=200&h=200&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1545247181-516773cae754?w=200&h=200&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=200&h=200&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=200&h=200&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?w=200&h=200&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=200&h=200&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=200&h=200&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1574484284002-952d92456975?w=200&h=200&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=200&h=200&fit=crop&auto=format',
  ],
  dessert: [
    'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=200&h=200&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1599785209707-a456fc1337cc?w=200&h=200&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=200&h=200&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=200&h=200&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=200&h=200&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=200&h=200&fit=crop&auto=format',
  ],
  beverage: [
    'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=200&h=200&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=200&h=200&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=200&h=200&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=200&h=200&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=200&h=200&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=200&h=200&fit=crop&auto=format',
  ],
  general: [
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=200&h=200&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=200&h=200&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&h=200&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=200&h=200&fit=crop&auto=format',
  ],
};

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getDishImageUrl(dishName: string): string {
  if (!dishName) return CATEGORY_POOLS.general[0];
  const lower = dishName.toLowerCase().trim();

  // 1. First check specific dish keyword matches
  for (const entry of SPECIFIC_DISH_IMAGES) {
    if (entry.keywords.some(keyword => lower.includes(keyword))) {
      return entry.url;
    }
  }

  // 2. Determine category pool for fallback hashing
  let poolKey = 'general';
  if (['idli', 'idly', 'dosa', 'pongal', 'poori', 'vada', 'upma', 'puttu', 'appam', 'uttapam', 'parotta', 'bhature'].some(k => lower.includes(k))) {
    poolKey = 'breakfast';
  } else if (['sweet', 'dessert', 'halwa', 'jamun', 'kheer', 'cake', 'ice cream', 'ladoo'].some(k => lower.includes(k))) {
    poolKey = 'dessert';
  } else if (['tea', 'coffee', 'juice', 'drink', 'beverage', 'lassi', 'milk'].some(k => lower.includes(k))) {
    poolKey = 'beverage';
  } else {
    poolKey = 'main';
  }

  const pool = CATEGORY_POOLS[poolKey] || CATEGORY_POOLS.general;
  const index = hashString(lower) % pool.length;
  return pool[index];
}

export function getFallbackUrl(): string {
  return CATEGORY_POOLS.general[0];
}

