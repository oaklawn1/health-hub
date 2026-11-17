// Built-in food list, focused on North Indian home and restaurant food.
// Values are typical home-style estimates per serving, based on the Indian Food
// Composition Tables (IFCT 2017, National Institute of Nutrition) and standard recipes.
// Real dishes vary with oil/ghee and portion size, so treat these as good approximations.
// Format: [name, serving label, grams per serving, kcal, protein g, carbs g, fat g, fibre g, extra search words]
const FOOD_ROWS = [
  // Rotis & breads
  ["Roti / Chapati (plain)", "roti", 40, 110, 3.5, 22, 1.5, 3, "phulka chapatti fulka"],
  ["Roti with ghee", "roti", 43, 135, 3.5, 22, 4.5, 3, "chapati chupdi"],
  ["Phulka (small, thin)", "phulka", 30, 80, 2.6, 16, 0.5, 2.3, "roti"],
  ["Paratha (plain)", "paratha", 80, 220, 5, 30, 9, 3.5, "parantha"],
  ["Aloo paratha", "paratha", 120, 300, 6.5, 42, 12, 4.5, "parantha potato"],
  ["Gobi paratha", "paratha", 120, 270, 6.5, 37, 11, 4.5, "parantha cauliflower"],
  ["Paneer paratha", "paratha", 120, 330, 12, 36, 15, 4, "parantha"],
  ["Mooli paratha", "paratha", 120, 250, 6, 36, 9.5, 4.5, "parantha radish"],
  ["Methi paratha / Thepla", "piece", 60, 180, 4.5, 24, 7.5, 3.5, "parantha"],
  ["Naan (plain)", "naan", 90, 260, 8, 45, 5, 2, ""],
  ["Butter naan", "naan", 95, 310, 8, 45, 10, 2, ""],
  ["Garlic naan", "naan", 95, 320, 8.5, 46, 10.5, 2, ""],
  ["Tandoori roti", "roti", 60, 150, 5, 30, 1, 4, ""],
  ["Rumali roti", "roti", 50, 140, 4, 28, 1.5, 1, ""],
  ["Missi roti", "roti", 60, 160, 6.5, 25, 3.5, 4.5, "besan"],
  ["Makki ki roti", "roti", 70, 180, 3.5, 32, 4.5, 3.5, "corn"],
  ["Bajra roti", "roti", 50, 140, 4, 26, 2.5, 4, "millet"],
  ["Puri", "puri", 25, 100, 1.8, 12, 5, 1, "poori"],
  ["Bhatura", "bhatura", 90, 290, 6, 40, 12, 1.5, "bhature"],
  ["Kulcha", "kulcha", 80, 220, 6.5, 40, 4, 2, ""],
  ["Amritsari kulcha (stuffed)", "kulcha", 150, 380, 9, 55, 14, 4, ""],
  ["Bread slice (white)", "slice", 28, 70, 2.3, 13, 0.9, 0.6, "toast"],
  ["Bread slice (brown / atta)", "slice", 28, 70, 3, 12, 1, 1.9, "toast wheat"],
  ["Pav", "pav", 40, 115, 3.5, 21, 2, 1, "bun"],
  // Rice & grains
  ["Rice (steamed, white)", "katori", 150, 195, 4, 43, 0.4, 0.6, "chawal plain"],
  ["Brown rice (cooked)", "katori", 150, 170, 3.8, 35, 1.4, 2.7, "chawal"],
  ["Jeera rice", "katori", 150, 230, 4, 42, 5, 1, "chawal"],
  ["Veg pulao", "katori", 150, 220, 4.5, 38, 5.5, 2, "pulav matar"],
  ["Veg biryani", "plate", 250, 400, 9, 62, 12, 4, ""],
  ["Chicken biryani", "plate", 300, 520, 28, 60, 18, 3, ""],
  ["Mutton biryani", "plate", 300, 580, 27, 60, 25, 3, ""],
  ["Khichdi (dal + rice)", "katori", 200, 220, 8, 36, 5, 4, "khichri"],
  ["Curd rice", "katori", 200, 210, 6, 32, 6, 1, "dahi chawal"],
  ["Rajma chawal", "plate", 350, 480, 16, 82, 8, 10, ""],
  ["Kadhi chawal", "plate", 350, 450, 12, 68, 13, 3, ""],
  ["Poha", "plate", 150, 250, 5, 42, 7, 3, "pohe"],
  ["Upma", "katori", 150, 220, 5.5, 33, 7.5, 3, "suji rava"],
  ["Dalia (savoury / with milk)", "bowl", 200, 200, 6, 36, 3.5, 5, "daliya broken wheat"],
  ["Oats with milk", "bowl", 250, 250, 10, 36, 7, 4.5, "oatmeal porridge"],
  ["Cornflakes with milk", "bowl", 230, 220, 7.5, 38, 4.5, 1, "cereal"],
  ["Muesli with milk", "bowl", 230, 280, 10, 44, 7, 5, "cereal"],
  ["Maggi / instant noodles", "pack", 70, 310, 7, 44, 12, 2, ""],
  // Dals & legumes
  ["Dal tadka (arhar / toor)", "katori", 150, 160, 8.5, 20, 5, 4.5, "yellow dal"],
  ["Dal fry", "katori", 150, 170, 9, 21, 5.5, 5, ""],
  ["Moong dal", "katori", 150, 140, 9, 19, 3.5, 4, "yellow"],
  ["Masoor dal", "katori", 150, 150, 9.5, 20, 3.5, 4.5, "red lentil"],
  ["Urad dal (dhuli)", "katori", 150, 170, 10, 21, 5, 5, ""],
  ["Chana dal", "katori", 150, 190, 10, 25, 5.5, 6, ""],
  ["Dal makhani", "katori", 150, 280, 11, 26, 14, 7, "maa ki dal"],
  ["Panchmel / mixed dal", "katori", 150, 165, 9, 21, 5, 5, ""],
  ["Rajma", "katori", 150, 210, 10.5, 30, 5.5, 8, "kidney beans"],
  ["Chole / Chana masala", "katori", 150, 240, 10.5, 32, 8, 9, "chickpea chhole"],
  ["Kala chana curry", "katori", 150, 220, 11, 30, 6, 9, ""],
  ["Lobia curry", "katori", 150, 190, 10, 27, 4.5, 7, "black eyed"],
  ["Kadhi pakora", "katori", 150, 200, 7, 16, 12, 2, "karhi"],
  ["Sambar", "katori", 150, 130, 6, 19, 3.5, 4.5, ""],
  ["Moong sprouts (boiled / salad)", "katori", 100, 100, 7.5, 15, 0.8, 5, "sprouted"],
  ["Boiled chana chaat", "katori", 120, 180, 9, 27, 3.5, 7.5, ""],
  ["Soya chunks curry", "katori", 150, 200, 17, 13, 9, 5, "nutrela soyabean"],
  // Sabzi
  ["Aloo gobi", "katori", 150, 150, 3.5, 17, 8, 4, "potato cauliflower"],
  ["Aloo matar", "katori", 150, 170, 4.5, 22, 7.5, 4.5, "potato peas"],
  ["Jeera aloo / Sukhi aloo", "katori", 150, 180, 3, 25, 8, 3, "potato"],
  ["Dum aloo", "katori", 150, 250, 4.5, 26, 14, 3.5, ""],
  ["Aloo methi", "katori", 150, 160, 3.5, 20, 7.5, 4, ""],
  ["Aloo palak", "katori", 150, 150, 4, 18, 7, 4, ""],
  ["Bhindi masala", "katori", 150, 140, 3, 12, 9, 4.5, "okra ladyfinger"],
  ["Baingan bharta", "katori", 150, 130, 3, 12, 8, 5, "brinjal eggplant"],
  ["Mix veg sabzi", "katori", 150, 140, 4, 15, 7.5, 5, "mixed vegetable"],
  ["Lauki / Ghiya sabzi", "katori", 150, 90, 2, 9, 5, 2.5, "bottle gourd"],
  ["Tori / Tinda sabzi", "katori", 150, 90, 2, 9, 5, 2.5, "ridge gourd turai"],
  ["Karela sabzi", "katori", 120, 120, 2.5, 10, 8, 4, "bitter gourd"],
  ["Gajar matar", "katori", 150, 130, 3.5, 15, 6.5, 5, "carrot peas"],
  ["Patta gobi sabzi", "katori", 150, 110, 3, 11, 6.5, 4, "cabbage bandh"],
  ["Beans aloo", "katori", 150, 140, 3.5, 16, 7, 5, "french beans"],
  ["Shimla mirch aloo", "katori", 150, 150, 3, 18, 7.5, 3.5, "capsicum"],
  ["Sarson ka saag", "katori", 150, 180, 6, 13, 12, 6, "mustard greens"],
  ["Matar mushroom", "katori", 150, 160, 6, 13, 9.5, 4.5, ""],
  ["Malai kofta", "katori", 180, 380, 9, 22, 28, 3, ""],
  ["Arbi sabzi", "katori", 150, 190, 3, 28, 7.5, 4.5, "colocasia"],
  ["Kaddu / Sitaphal sabzi", "katori", 150, 110, 2, 14, 5.5, 3, "pumpkin"],
  // Paneer
  ["Paneer (raw)", "100 g", 100, 290, 19, 3, 23, 0, "cottage cheese"],
  ["Palak paneer", "katori", 150, 270, 13, 9, 20, 3.5, "saag"],
  ["Paneer butter masala", "katori", 150, 360, 14, 12, 28, 2, "makhani"],
  ["Shahi paneer", "katori", 150, 380, 14, 13, 30, 2, ""],
  ["Kadai paneer", "katori", 150, 320, 15, 11, 24, 3, "karahi"],
  ["Matar paneer", "katori", 150, 280, 13, 14, 19, 4, "mutter"],
  ["Paneer bhurji", "katori", 120, 290, 17, 7, 22, 1.5, ""],
  ["Paneer tikka", "6 pieces", 150, 330, 19, 8, 25, 1.5, "tandoori"],
  ["Tofu (raw)", "100 g", 100, 120, 13, 2.5, 7, 1, "soya paneer"],
  // Egg, chicken, meat, fish
  ["Egg (boiled)", "egg", 50, 78, 6.3, 0.6, 5.3, 0, "anda"],
  ["Egg white (boiled)", "egg white", 33, 17, 3.6, 0.2, 0, 0, "anda"],
  ["Omelette (2 eggs)", "omelette", 120, 220, 13, 2, 17, 0.3, "anda"],
  ["Egg bhurji (2 eggs)", "serving", 130, 230, 13, 4, 18, 0.8, "anda scrambled"],
  ["Egg curry (2 eggs)", "katori", 200, 290, 15, 8, 22, 1.5, "anda"],
  ["Chicken curry", "katori", 200, 300, 27, 7, 18, 1.5, "murgh"],
  ["Butter chicken", "katori", 200, 440, 28, 10, 32, 1.5, "murgh makhani"],
  ["Kadai chicken", "katori", 200, 330, 28, 8, 21, 2, ""],
  ["Tandoori chicken", "2 pieces", 150, 260, 34, 4, 12, 0.5, ""],
  ["Chicken tikka", "6 pieces", 150, 240, 35, 4, 9, 0.5, ""],
  ["Chicken breast (grilled)", "100 g", 100, 165, 31, 0, 3.6, 0, ""],
  ["Mutton curry / Rogan josh", "katori", 200, 380, 26, 6, 28, 1, "gosht lamb"],
  ["Keema", "katori", 150, 350, 24, 6, 26, 1.5, "mince"],
  ["Seekh kebab", "2 pieces", 100, 250, 17, 4, 18, 0.5, "kabab"],
  ["Fish curry", "katori", 200, 250, 24, 6, 14, 1, "machli"],
  ["Fish fry / Amritsari fish", "2 pieces", 120, 280, 22, 10, 17, 0.5, "machli"],
  // Dairy
  ["Milk (toned)", "glass", 250, 150, 8, 12, 7.5, 0, "doodh"],
  ["Milk (full cream)", "glass", 250, 215, 8, 12, 15, 0, "doodh"],
  ["Milk (double toned)", "glass", 250, 115, 8, 12, 3.8, 0, "doodh skim"],
  ["Curd / Dahi", "katori", 150, 95, 5, 7, 5, 0, "yogurt yoghurt"],
  ["Greek yogurt (plain)", "100 g", 100, 95, 9, 4, 5, 0, "curd"],
  ["Boondi raita", "katori", 150, 130, 5, 11, 7, 0.5, ""],
  ["Cucumber / veg raita", "katori", 150, 80, 4, 7, 4, 0.5, "kheera"],
  ["Lassi (sweet)", "glass", 250, 220, 7, 34, 6, 0, ""],
  ["Chaas / Salted lassi", "glass", 250, 60, 3, 5, 3, 0, "buttermilk chhachh"],
  ["Ghee", "tsp", 5, 45, 0, 0, 5, 0, ""],
  ["Butter", "tsp", 5, 36, 0, 0, 4, 0, "makhan"],
  ["Cheese slice", "slice", 20, 62, 4, 0.5, 5, 0, ""],
  ["Whey protein", "scoop", 30, 120, 24, 3, 1.5, 0, "shake supplement"],
  // Snacks & street food
  ["Samosa", "samosa", 100, 260, 4.5, 30, 14, 2.5, ""],
  ["Kachori", "kachori", 60, 190, 4, 20, 10.5, 2, ""],
  ["Pakora (mixed veg)", "4 pieces", 80, 240, 6, 22, 14, 3, "pakoda bhajiya"],
  ["Paneer pakora", "4 pieces", 100, 320, 13, 18, 22, 1.5, "pakoda"],
  ["Bread pakora", "piece", 100, 290, 7, 32, 15, 2.5, "pakoda"],
  ["Aloo tikki", "tikki", 60, 130, 2.5, 18, 5.5, 2, ""],
  ["Chole bhature", "plate (2 bhature)", 330, 820, 22, 112, 32, 12, "chhole"],
  ["Chole kulche", "plate (2 kulche)", 310, 600, 22, 100, 12, 12, "matar"],
  ["Pav bhaji", "plate (2 pav)", 300, 550, 13, 75, 22, 8, ""],
  ["Vada pav", "piece", 130, 300, 7, 42, 12, 3, ""],
  ["Golgappe / Pani puri", "6 pieces", 120, 180, 3.5, 30, 5.5, 2.5, "puchka"],
  ["Bhel puri", "plate", 120, 250, 6, 42, 7, 4, ""],
  ["Papdi chaat", "plate", 150, 320, 8, 40, 14, 4, ""],
  ["Dahi bhalla", "2 pieces", 150, 260, 9, 32, 10, 3, "vada"],
  ["Momos (veg, steamed)", "6 pieces", 150, 210, 6, 36, 4.5, 2.5, ""],
  ["Momos (chicken, steamed)", "6 pieces", 150, 250, 14, 30, 8, 1.5, ""],
  ["Dhokla", "2 pieces", 80, 150, 5.5, 22, 4.5, 2, ""],
  ["Idli", "2 idli", 80, 120, 4, 25, 0.5, 1.5, ""],
  ["Dosa (plain)", "dosa", 90, 170, 4, 28, 4.5, 1.5, ""],
  ["Masala dosa", "dosa", 200, 350, 7, 52, 12.5, 4, ""],
  ["Uttapam", "piece", 120, 220, 6, 34, 6.5, 2.5, ""],
  ["Besan chilla", "chilla", 80, 150, 7.5, 17, 5.5, 3.5, "cheela"],
  ["Moong dal chilla", "chilla", 80, 130, 8, 17, 3.5, 3, "cheela"],
  ["Veg sandwich (grilled)", "sandwich", 150, 250, 8, 36, 8, 4, ""],
  ["Paneer sandwich", "sandwich", 170, 330, 15, 36, 14, 3.5, ""],
  ["Paneer kathi roll", "roll", 200, 420, 17, 46, 19, 4, "frankie wrap"],
  ["Chicken kathi roll", "roll", 200, 430, 24, 44, 17, 3, "frankie wrap"],
  ["Papad (roasted)", "papad", 12, 40, 2.8, 6.5, 0.3, 1, ""],
  ["Papad (fried)", "papad", 14, 60, 2.8, 6.5, 2.5, 1, ""],
  ["Namkeen / Bhujia", "30 g", 30, 170, 4, 14, 11, 2, "mixture sev"],
  ["Roasted chana", "30 g", 30, 110, 6.5, 17, 1.8, 5, "bhuna"],
  ["Makhana (roasted)", "30 g", 30, 105, 3, 22, 0.3, 4, "fox nut"],
  ["Peanuts", "30 g", 30, 170, 7.5, 5, 14.5, 2.5, "moongfali"],
  ["Almonds", "10 almonds", 12, 70, 2.5, 2.5, 6, 1.5, "badam"],
  ["Cashews", "10 cashews", 15, 85, 2.7, 4.5, 6.5, 0.5, "kaju"],
  ["Walnuts", "4 halves", 12, 80, 1.8, 1.6, 7.8, 0.8, "akhrot"],
  ["Peanut butter", "tbsp", 16, 95, 4, 3, 8, 1, ""],
  ["Biscuits (Marie)", "4 biscuits", 22, 95, 1.8, 17, 2.5, 0.5, ""],
  ["Biscuits (glucose)", "4 biscuits", 24, 110, 1.7, 18.5, 3, 0.3, "parle"],
  ["Rusk", "2 rusks", 20, 85, 2, 15, 2, 0.6, ""],
  ["French fries", "medium", 110, 340, 4, 44, 16, 4, "chips"],
  ["Pizza (veg)", "slice", 110, 270, 11, 33, 10, 2.3, ""],
  ["Burger (veg / aloo tikki)", "burger", 150, 340, 8, 48, 13, 3.5, ""],
  ["Pasta (red / white sauce)", "bowl", 250, 380, 11, 55, 12.5, 4, ""],
  // Sweets
  ["Gulab jamun", "piece", 50, 150, 2, 25, 5, 0.2, "mithai"],
  ["Rasgulla", "piece", 50, 110, 2, 24, 1, 0, "mithai"],
  ["Rasmalai", "piece", 70, 170, 5, 22, 7, 0, "mithai"],
  ["Jalebi", "2 pieces", 55, 200, 1.5, 34, 6.5, 0.2, "mithai"],
  ["Kheer", "katori", 150, 240, 6.5, 36, 8, 0.3, "payasam"],
  ["Gajar ka halwa", "katori", 100, 280, 4.5, 36, 13.5, 2, ""],
  ["Sooji halwa", "katori", 100, 300, 3.5, 42, 13.5, 1, "suji sheera"],
  ["Besan ladoo", "ladoo", 40, 180, 3.5, 20, 9.5, 1.2, "laddu"],
  ["Motichoor ladoo", "ladoo", 40, 170, 2, 24, 7.5, 0.5, "laddu boondi"],
  ["Kaju katli", "piece", 12, 60, 1.3, 7, 3, 0.2, "barfi"],
  ["Barfi (milk)", "piece", 30, 130, 3, 16, 6, 0, "burfi"],
  ["Ice cream", "scoop", 70, 140, 2.5, 17, 7, 0, "kulfi"],
  ["Chocolate (milk)", "4 squares", 20, 107, 1.5, 12, 6, 0.4, ""],
  // Drinks
  ["Chai (milk + sugar)", "cup", 150, 80, 2, 11, 2.5, 0, "tea"],
  ["Chai (milk, no sugar)", "cup", 150, 40, 2, 3.5, 2.5, 0, "tea"],
  ["Coffee (milk + sugar)", "cup", 150, 90, 2.5, 12, 3, 0, ""],
  ["Black coffee / Green tea", "cup", 150, 2, 0, 0, 0, 0, ""],
  ["Nimbu pani (sweet)", "glass", 250, 70, 0, 18, 0, 0, "lemonade shikanji"],
  ["Coconut water", "glass", 250, 50, 0.5, 12, 0, 0, "nariyal"],
  ["Fruit juice (fresh)", "glass", 250, 115, 1, 27, 0.3, 0.5, "orange mosambi"],
  ["Soft drink", "can 330 ml", 330, 140, 0, 35, 0, 0, "cola coke pepsi"],
  ["Beer", "330 ml", 330, 140, 1, 11, 0, 0, "alcohol"],
  ["Whisky / Rum / Vodka", "30 ml peg", 30, 70, 0, 0, 0, 0, "alcohol"],
  ["Wine", "glass 150 ml", 150, 125, 0, 4, 0, 0, "alcohol"],
  // Fruit & salad
  ["Banana", "banana", 120, 105, 1.3, 27, 0.3, 3, "kela"],
  ["Apple", "apple", 180, 95, 0.5, 25, 0.3, 4.5, "seb"],
  ["Mango", "mango", 200, 130, 1.5, 32, 0.8, 3.5, "aam"],
  ["Orange / Kinnow", "orange", 130, 62, 1.2, 15, 0.2, 3, "santra"],
  ["Papaya", "bowl", 150, 65, 0.7, 16, 0.4, 2.5, "papita"],
  ["Guava", "guava", 100, 68, 2.5, 14, 1, 5.5, "amrood"],
  ["Grapes", "bowl", 100, 70, 0.7, 18, 0.2, 0.9, "angoor"],
  ["Watermelon", "bowl", 200, 60, 1.2, 15, 0.3, 0.8, "tarbooz"],
  ["Pomegranate", "half cup", 85, 72, 1.5, 16, 1, 3.5, "anar"],
  ["Dates", "2 dates", 16, 45, 0.4, 12, 0, 1.3, "khajoor"],
  ["Salad (cucumber, tomato, onion)", "plate", 150, 40, 1.5, 8, 0.3, 2.5, "kachumber"],
  // Add-ons
  ["Cooking oil", "tsp", 5, 45, 0, 0, 5, 0, "tel"],
  ["Sugar", "tsp", 5, 20, 0, 5, 0, 0, "cheeni"],
  ["Honey", "tsp", 7, 21, 0, 5.8, 0, 0, "shahad"],
  ["Jaggery", "10 g", 10, 38, 0, 9.8, 0, 0, "gur"],
  ["Achar (pickle)", "tsp", 10, 20, 0.2, 1, 1.8, 0.3, ""],
  ["Green chutney", "tbsp", 15, 10, 0.4, 1.5, 0.3, 0.5, "dhaniya pudina"],
];

const Foods = (() => {
  const builtin = FOOD_ROWS.map(r => ({
    name: r[0], unit: r[1], grams: r[2], kcal: r[3], protein: r[4], carbs: r[5], fat: r[6], fiber: r[7],
    search: (r[0] + " " + r[8]).toLowerCase(), source: "built-in",
  }));

  function custom() {
    return Store.all("custom_food").map(f => Object.assign({ search: (f.name || "").toLowerCase(), source: "my food" }, f));
  }

  function search(q) {
    q = (q || "").toLowerCase().trim();
    const list = custom().concat(builtin);
    if (!q) return list;
    const words = q.split(/\s+/);
    return list
      .filter(f => words.every(w => f.search.includes(w)))
      .sort((a, b) => (a.search.startsWith(q) ? 0 : 1) - (b.search.startsWith(q) ? 0 : 1));
  }

  // Free packaged-food lookup (Open Food Facts - open data, no key needed).
  async function searchOnline(q) {
    q = q.trim();
    let products;
    if (/^\d{8,14}$/.test(q)) {
      // A barcode: Open Food Facts allows this lookup straight from the browser.
      const r = await fetch("https://world.openfoodfacts.org/api/v2/product/" + q + ".json?fields=product_name,brands,nutriments");
      const j = r.ok ? await r.json() : {};
      products = j.product ? [j.product] : [];
    } else {
      // Text search goes through our own database, because Open Food Facts blocks it from websites.
      let j;
      try { j = await Store.rpc("food_search", { q }); }
      catch (e) { try { await new Promise(r => setTimeout(r, 1200)); j = await Store.rpc("food_search", { q }); } catch (e2) { j = null; } }
      if (!j) { throw new Error("Online food search is unavailable right now - try again in a minute, or create the food yourself."); }
      products = (j && j.hits) || [];
    }
    // Rank by how many of the typed words appear in the product name/brand; drop ones that match none.
    const words = q.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 1);
    const score = p => { const t = ((p.product_name || "") + " " + [].concat(p.brands || []).join(" ")).toLowerCase(); return words.filter(w => t.includes(w)).length; };
    if (words.length) products = products.map(p => [p, score(p)]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).map(x => x[0]);
    return products.map(p => {
      const n = p.nutriments || {};
      const kcal = n["energy-kcal_100g"];
      if (!p.product_name || kcal == null) return null;
      const brand = Array.isArray(p.brands) ? p.brands[0] : p.brands ? String(p.brands).split(",")[0] : "";
      return {
        name: p.product_name + (brand && !p.product_name.toLowerCase().includes(brand.toLowerCase()) ? " (" + brand + ")" : ""),
        unit: "100 g", grams: 100, kcal: +kcal || 0, protein: +n.proteins_100g || 0,
        carbs: +n.carbohydrates_100g || 0, fat: +n.fat_100g || 0, fiber: +n.fiber_100g || 0,
        source: "Open Food Facts",
      };
    }).filter(Boolean);
  }

  return { search, searchOnline };
})();
