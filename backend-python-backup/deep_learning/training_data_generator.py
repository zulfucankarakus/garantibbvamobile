"""
CNN Training Data Generator
Zengin egitim verisi uretici ve veri artirma (data augmentation)

- 20 kategori icin kapsamli egitim verisi
- Sentetik veri uretimi
- Data augmentation teknikleri
"""

import random
import numpy as np
from typing import Dict, Any, List
import logging

logger = logging.getLogger(__name__)


class TrainingDataGenerator:
    """Egitim Verisi Uretici"""
    
    # Her kategori icin zengin etiket seti
    CATEGORY_LABELS = {
        'vehicle': {
            'brands': ['BMW', 'Mercedes', 'Audi', 'Toyota', 'Honda', 'Ford', 'Volkswagen', 'Porsche', 'Ferrari', 'Lamborghini', 'Tesla', 'Hyundai', 'Kia', 'Nissan', 'Mazda', 'Volvo', 'Jaguar', 'Land Rover', 'Jeep', 'Chevrolet'],
            'types': ['car', 'automobile', 'sedan', 'SUV', 'truck', 'motorcycle', 'sports car', 'convertible', 'hatchback', 'coupe', 'minivan', 'pickup', 'crossover', 'electric car', 'hybrid'],
            'parts': ['wheel', 'tire', 'engine', 'steering wheel', 'dashboard', 'headlight', 'bumper', 'windshield', 'mirror', 'exhaust'],
            'attributes': ['luxury', 'fast', 'modern', 'classic', 'vintage', 'new', 'used', 'sporty', 'family', 'compact']
        },
        'electronics': {
            'brands': ['Apple', 'Samsung', 'Sony', 'LG', 'Microsoft', 'Dell', 'HP', 'Lenovo', 'Asus', 'Acer', 'Nintendo', 'Bose', 'JBL', 'Canon', 'Nikon', 'GoPro', 'DJI', 'Xiaomi', 'Huawei', 'Google'],
            'types': ['smartphone', 'iPhone', 'laptop', 'computer', 'tablet', 'iPad', 'TV', 'television', 'monitor', 'camera', 'headphone', 'speaker', 'smartwatch', 'gaming console', 'PlayStation', 'Xbox', 'drone', 'printer', 'router', 'keyboard'],
            'attributes': ['wireless', 'bluetooth', 'HD', '4K', 'smart', 'portable', 'gaming', 'professional', 'compact', 'touchscreen']
        },
        'home': {
            'brands': ['IKEA', 'Bosch', 'Samsung', 'LG', 'Dyson', 'Philips', 'Siemens', 'Whirlpool', 'Electrolux', 'KitchenAid'],
            'types': ['refrigerator', 'washing machine', 'dishwasher', 'microwave', 'oven', 'vacuum cleaner', 'air conditioner', 'heater', 'blender', 'toaster', 'coffee maker', 'iron', 'fan', 'humidifier', 'water purifier'],
            'attributes': ['stainless steel', 'energy efficient', 'smart home', 'compact', 'large capacity', 'modern', 'vintage']
        },
        'clothing': {
            'brands': ['Nike', 'Adidas', 'Zara', 'H&M', 'Gucci', 'Prada', 'Louis Vuitton', 'Chanel', 'Burberry', 'Ralph Lauren', 'Tommy Hilfiger', 'Calvin Klein', 'Levis', 'Gap', 'Uniqlo', 'Mango', 'Massimo Dutti'],
            'types': ['shirt', 't-shirt', 'pants', 'jeans', 'dress', 'skirt', 'jacket', 'coat', 'sweater', 'hoodie', 'blazer', 'suit', 'shorts', 'blouse', 'cardigan', 'vest', 'polo'],
            'attributes': ['cotton', 'silk', 'wool', 'leather', 'denim', 'casual', 'formal', 'elegant', 'sporty', 'vintage', 'designer']
        },
        'jewelry': {
            'brands': ['Tiffany', 'Cartier', 'Bulgari', 'Chopard', 'Van Cleef', 'Harry Winston', 'Graff', 'Piaget', 'Swarovski', 'Pandora'],
            'types': ['ring', 'necklace', 'bracelet', 'earring', 'pendant', 'brooch', 'anklet', 'cufflinks', 'tiara', 'choker'],
            'materials': ['gold', 'silver', 'platinum', 'diamond', 'ruby', 'sapphire', 'emerald', 'pearl', 'opal', 'amethyst', '18k', '24k', 'white gold', 'rose gold'],
            'attributes': ['luxury', 'handmade', 'vintage', 'antique', 'designer', 'engagement', 'wedding']
        },
        'food': {
            'types': ['pizza', 'burger', 'sushi', 'pasta', 'salad', 'steak', 'sandwich', 'soup', 'cake', 'ice cream', 'chocolate', 'fruit', 'vegetable', 'bread', 'cheese', 'wine', 'coffee', 'tea'],
            'cuisines': ['Italian', 'Japanese', 'Mexican', 'Chinese', 'Indian', 'French', 'Thai', 'Korean', 'Turkish', 'Mediterranean'],
            'attributes': ['organic', 'fresh', 'homemade', 'gourmet', 'vegan', 'vegetarian', 'gluten-free', 'healthy', 'delicious']
        },
        'sports': {
            'brands': ['Nike', 'Adidas', 'Puma', 'Under Armour', 'Reebok', 'New Balance', 'Asics', 'Wilson', 'Spalding', 'Callaway'],
            'types': ['football', 'basketball', 'tennis racket', 'golf club', 'bicycle', 'treadmill', 'dumbbell', 'yoga mat', 'swimming goggles', 'boxing gloves', 'skateboard', 'surfboard', 'ski', 'snowboard'],
            'activities': ['running', 'fitness', 'gym', 'workout', 'training', 'exercise', 'outdoor', 'hiking', 'camping', 'swimming'],
            'attributes': ['professional', 'beginner', 'lightweight', 'durable', 'ergonomic', 'adjustable']
        },
        'furniture': {
            'brands': ['IKEA', 'Ashley', 'La-Z-Boy', 'Pottery Barn', 'West Elm', 'Crate & Barrel', 'Restoration Hardware', 'CB2', 'Wayfair'],
            'types': ['sofa', 'couch', 'bed', 'mattress', 'table', 'chair', 'desk', 'wardrobe', 'bookshelf', 'cabinet', 'dresser', 'nightstand', 'ottoman', 'armchair', 'recliner', 'bench'],
            'materials': ['wood', 'leather', 'fabric', 'metal', 'glass', 'marble', 'oak', 'walnut', 'pine', 'mahogany'],
            'attributes': ['modern', 'vintage', 'minimalist', 'rustic', 'industrial', 'scandinavian', 'comfortable', 'ergonomic']
        },
        'cosmetics': {
            'brands': ['MAC', 'NARS', 'Urban Decay', 'Charlotte Tilbury', 'Fenty Beauty', 'Maybelline', 'LOreal', 'Estee Lauder', 'Clinique', 'Lancome', 'Dior', 'Chanel', 'YSL', 'Bobbi Brown', 'Too Faced'],
            'types': ['lipstick', 'mascara', 'foundation', 'concealer', 'eyeshadow', 'blush', 'bronzer', 'highlighter', 'primer', 'setting spray', 'lip gloss', 'eyeliner', 'brow pencil', 'nail polish'],
            'skincare': ['moisturizer', 'serum', 'cleanser', 'toner', 'sunscreen', 'eye cream', 'face mask', 'exfoliator', 'retinol', 'vitamin C'],
            'attributes': ['matte', 'glossy', 'waterproof', 'long-lasting', 'organic', 'cruelty-free', 'vegan', 'hydrating']
        },
        'books': {
            'types': ['novel', 'textbook', 'magazine', 'comic', 'manga', 'biography', 'cookbook', 'dictionary', 'encyclopedia', 'journal', 'notebook', 'planner', 'diary'],
            'genres': ['fiction', 'non-fiction', 'fantasy', 'science fiction', 'romance', 'mystery', 'thriller', 'horror', 'self-help', 'business', 'history', 'science'],
            'stationery': ['pen', 'pencil', 'marker', 'highlighter', 'eraser', 'ruler', 'scissors', 'tape', 'stapler', 'paper', 'folder', 'binder'],
            'attributes': ['hardcover', 'paperback', 'bestseller', 'classic', 'new release', 'signed', 'limited edition']
        },
        'toys': {
            'brands': ['LEGO', 'Barbie', 'Hot Wheels', 'Nerf', 'Play-Doh', 'Fisher-Price', 'Hasbro', 'Mattel', 'Nintendo', 'Funko'],
            'types': ['doll', 'action figure', 'building blocks', 'puzzle', 'board game', 'stuffed animal', 'remote control car', 'drone', 'robot', 'train set', 'dollhouse', 'playset'],
            'attributes': ['educational', 'interactive', 'electronic', 'wooden', 'plush', 'collectible', 'vintage', 'limited edition']
        },
        'watch': {
            'brands': ['Rolex', 'Omega', 'Patek Philippe', 'Cartier', 'Tag Heuer', 'Breitling', 'IWC', 'Audemars Piguet', 'Longines', 'Tissot', 'Seiko', 'Casio', 'Citizen', 'Fossil', 'Michael Kors', 'Apple Watch', 'Samsung Galaxy Watch', 'Garmin', 'Fitbit'],
            'types': ['wristwatch', 'smartwatch', 'chronograph', 'dive watch', 'dress watch', 'sports watch', 'digital watch', 'analog watch', 'pocket watch'],
            'materials': ['stainless steel', 'gold', 'titanium', 'ceramic', 'leather strap', 'metal bracelet', 'rubber strap'],
            'attributes': ['luxury', 'automatic', 'quartz', 'mechanical', 'waterproof', 'Swiss made', 'limited edition', 'vintage']
        },
        'shoes': {
            'brands': ['Nike', 'Adidas', 'Jordan', 'New Balance', 'Puma', 'Converse', 'Vans', 'Reebok', 'Asics', 'Timberland', 'Dr. Martens', 'Clarks', 'Steve Madden', 'Christian Louboutin', 'Jimmy Choo', 'Gucci', 'Balenciaga', 'Yeezy'],
            'types': ['sneaker', 'running shoe', 'boot', 'sandal', 'heel', 'flat', 'loafer', 'oxford', 'slip-on', 'trainer', 'basketball shoe', 'football cleat', 'hiking boot', 'dress shoe', 'slipper'],
            'attributes': ['comfortable', 'stylish', 'leather', 'canvas', 'suede', 'waterproof', 'breathable', 'cushioned', 'lightweight']
        },
        'bags': {
            'brands': ['Louis Vuitton', 'Gucci', 'Chanel', 'Hermes', 'Prada', 'Dior', 'Fendi', 'Balenciaga', 'Celine', 'Burberry', 'Coach', 'Michael Kors', 'Kate Spade', 'Tory Burch', 'Longchamp'],
            'types': ['handbag', 'backpack', 'tote', 'clutch', 'crossbody', 'shoulder bag', 'messenger bag', 'briefcase', 'wallet', 'purse', 'luggage', 'suitcase', 'duffel bag', 'laptop bag'],
            'materials': ['leather', 'canvas', 'nylon', 'suede', 'fabric', 'vegan leather'],
            'attributes': ['designer', 'luxury', 'casual', 'formal', 'travel', 'everyday', 'vintage', 'limited edition']
        },
        'music': {
            'brands': ['Fender', 'Gibson', 'Yamaha', 'Roland', 'Korg', 'Steinway', 'Marshall', 'Boss', 'Shure', 'Audio-Technica', 'Sennheiser', 'Pearl', 'DW', 'Zildjian'],
            'types': ['guitar', 'electric guitar', 'acoustic guitar', 'bass', 'piano', 'keyboard', 'drum', 'drum kit', 'violin', 'cello', 'flute', 'saxophone', 'trumpet', 'synthesizer', 'microphone', 'amplifier', 'speaker', 'DJ equipment'],
            'attributes': ['professional', 'beginner', 'acoustic', 'electric', 'digital', 'vintage', 'custom', 'handmade']
        },
        'outdoor': {
            'brands': ['Coleman', 'The North Face', 'Patagonia', 'REI', 'Weber', 'Traeger', 'Yeti', 'Osprey', 'Black Diamond', 'MSR'],
            'types': ['tent', 'sleeping bag', 'camping chair', 'cooler', 'grill', 'barbecue', 'patio furniture', 'hammock', 'umbrella', 'fire pit', 'outdoor heater', 'garden tools', 'lawn mower', 'pool', 'hot tub'],
            'activities': ['camping', 'hiking', 'fishing', 'hunting', 'gardening', 'grilling', 'outdoor dining', 'picnic'],
            'attributes': ['waterproof', 'portable', 'durable', 'lightweight', 'insulated', 'UV resistant']
        },
        'baby': {
            'brands': ['Pampers', 'Huggies', 'Graco', 'Chicco', 'Fisher-Price', 'Baby Bjorn', 'Uppababy', 'Bugaboo', 'Ergobaby', 'Britax'],
            'types': ['stroller', 'car seat', 'crib', 'bassinet', 'high chair', 'baby carrier', 'diaper', 'bottle', 'pacifier', 'baby monitor', 'baby swing', 'playpen', 'changing table', 'baby clothes', 'onesie'],
            'attributes': ['safe', 'comfortable', 'organic', 'hypoallergenic', 'BPA-free', 'adjustable', 'portable', 'easy to clean']
        },
        'pet': {
            'brands': ['Purina', 'Royal Canin', 'Blue Buffalo', 'Hills', 'Kong', 'PetSafe', 'Chewy', 'Greenies', 'Friskies', 'Whiskas'],
            'types': ['dog food', 'cat food', 'pet bed', 'leash', 'collar', 'pet carrier', 'aquarium', 'fish tank', 'bird cage', 'hamster wheel', 'cat tree', 'scratching post', 'pet toy', 'pet bowl', 'litter box'],
            'animals': ['dog', 'cat', 'fish', 'bird', 'hamster', 'rabbit', 'turtle', 'snake', 'parrot', 'guinea pig'],
            'attributes': ['natural', 'organic', 'grain-free', 'durable', 'washable', 'interactive', 'automatic']
        },
        'art': {
            'types': ['painting', 'sculpture', 'print', 'photograph', 'poster', 'canvas', 'frame', 'vase', 'statue', 'figurine', 'wall art', 'tapestry', 'mirror', 'clock', 'candle', 'plant pot'],
            'styles': ['modern', 'contemporary', 'abstract', 'impressionist', 'minimalist', 'vintage', 'antique', 'bohemian', 'rustic', 'industrial'],
            'materials': ['oil paint', 'acrylic', 'watercolor', 'bronze', 'marble', 'ceramic', 'glass', 'metal', 'wood'],
            'attributes': ['original', 'limited edition', 'signed', 'handmade', 'custom', 'decorative', 'collectible']
        },
        'other': {
            'types': ['miscellaneous', 'general', 'various', 'assorted', 'mixed', 'unknown', 'unspecified'],
            'attributes': ['unique', 'special', 'rare', 'common', 'standard']
        }
    }
    
    def __init__(self):
        logger.info("TrainingDataGenerator initialized")
    
    def generate_training_sample(self, category: str, num_labels: int = 5) -> Dict[str, Any]:
        """Tek bir egitim ornegi olustur"""
        if category not in self.CATEGORY_LABELS:
            category = 'other'
        
        cat_data = self.CATEGORY_LABELS[category]
        labels = []
        
        # Her alt kategoriden rastgele etiket sec
        for key, values in cat_data.items():
            num_to_pick = min(2, len(values), max(1, num_labels // len(cat_data)))
            labels.extend(random.sample(values, num_to_pick))
        
        # Karistir ve sinirla
        random.shuffle(labels)
        labels = labels[:num_labels]
        
        return {
            "labels": labels,
            "category": category
        }
    
    def generate_training_dataset(self, samples_per_category: int = 50) -> List[Dict[str, Any]]:
        """Tum kategoriler icin egitim seti olustur"""
        dataset = []
        categories = list(self.CATEGORY_LABELS.keys())
        
        for category in categories:
            for _ in range(samples_per_category):
                num_labels = random.randint(3, 7)
                sample = self.generate_training_sample(category, num_labels)
                dataset.append(sample)
        
        random.shuffle(dataset)
        logger.info(f"Generated {len(dataset)} training samples for {len(categories)} categories")
        
        return dataset
    
    def generate_augmented_sample(self, original: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Data augmentation - bir ornekten birden fazla ornek olustur"""
        augmented = [original]
        labels = original['labels']
        category = original['category']
        
        # 1. Etiket alt kumesi
        if len(labels) > 2:
            subset_size = random.randint(2, len(labels) - 1)
            augmented.append({
                "labels": random.sample(labels, subset_size),
                "category": category
            })
        
        # 2. Etiket sirasi degistirme
        shuffled = labels.copy()
        random.shuffle(shuffled)
        augmented.append({
            "labels": shuffled,
            "category": category
        })
        
        # 3. Kategori etiketleri ekleme
        if category in self.CATEGORY_LABELS:
            cat_data = self.CATEGORY_LABELS[category]
            extra_labels = []
            for values in cat_data.values():
                if values:
                    extra_labels.append(random.choice(values))
            
            augmented.append({
                "labels": labels + extra_labels[:2],
                "category": category
            })
        
        return augmented
    
    def generate_augmented_dataset(self, base_samples_per_category: int = 30,
                                    augmentation_factor: int = 3) -> List[Dict[str, Any]]:
        """Augmented egitim seti olustur"""
        base_dataset = self.generate_training_dataset(base_samples_per_category)
        augmented_dataset = []
        
        for sample in base_dataset:
            augmented = self.generate_augmented_sample(sample)
            augmented_dataset.extend(augmented[:augmentation_factor])
        
        random.shuffle(augmented_dataset)
        logger.info(f"Generated augmented dataset with {len(augmented_dataset)} samples")
        
        return augmented_dataset
    
    def get_category_examples(self, category: str, count: int = 5) -> List[Dict[str, Any]]:
        """Belirli bir kategori icin ornek etiketler getir"""
        examples = []
        for _ in range(count):
            examples.append(self.generate_training_sample(category, random.randint(4, 6)))
        return examples
    
    def get_all_keywords(self) -> Dict[str, int]:
        """Tum anahtar kelimeleri ve sayilarini getir"""
        keyword_counts = {}
        for category, data in self.CATEGORY_LABELS.items():
            count = sum(len(v) for v in data.values())
            keyword_counts[category] = count
        return keyword_counts


# Singleton instance
training_data_generator = TrainingDataGenerator()
