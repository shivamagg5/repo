// =============================================================================
// Indian Cities Master List
// Contains Popular/Metro entertainment hubs and complete A-Z list of Indian cities.
// =============================================================================

class CityInfo {
  final String name;
  final String state;
  final String? emoji;
  final bool isPopular;

  const CityInfo({
    required this.name,
    required this.state,
    this.emoji,
    this.isPopular = false,
  });
}

const List<CityInfo> popularCities = [
  CityInfo(name: 'All India', state: 'Pan India', emoji: '🇮🇳', isPopular: true),
  CityInfo(name: 'Mumbai', state: 'Maharashtra', emoji: '🏙️', isPopular: true),
  CityInfo(name: 'Delhi NCR', state: 'National Capital Region', emoji: '🏛️', isPopular: true),
  CityInfo(name: 'Bengaluru', state: 'Karnataka', emoji: '🌳', isPopular: true),
  CityInfo(name: 'Hyderabad', state: 'Telangana', emoji: '💎', isPopular: true),
  CityInfo(name: 'Goa', state: 'Goa', emoji: '🏖️', isPopular: true),
  CityInfo(name: 'Pune', state: 'Maharashtra', emoji: '🎭', isPopular: true),
  CityInfo(name: 'Kolkata', state: 'West Bengal', emoji: '🎨', isPopular: true),
  CityInfo(name: 'Chennai', state: 'Tamil Nadu', emoji: '🌊', isPopular: true),
  CityInfo(name: 'Jaipur', state: 'Rajasthan', emoji: '🏰', isPopular: true),
  CityInfo(name: 'Ahmedabad', state: 'Gujarat', emoji: '🪁', isPopular: true),
  CityInfo(name: 'Chandigarh', state: 'Punjab / Haryana', emoji: '🌹', isPopular: true),
  CityInfo(name: 'Kochi', state: 'Kerala', emoji: '🌴', isPopular: true),
  CityInfo(name: 'Indore', state: 'Madhya Pradesh', emoji: '🍔', isPopular: true),
  CityInfo(name: 'Lucknow', state: 'Uttar Pradesh', emoji: '👑', isPopular: true),
];

const List<CityInfo> allIndianCities = [
  // All India Option
  CityInfo(name: 'All India', state: 'Pan India', emoji: '🇮🇳', isPopular: true),

  // A
  CityInfo(name: 'Agartala', state: 'Tripura'),
  CityInfo(name: 'Agra', state: 'Uttar Pradesh'),
  CityInfo(name: 'Ahmedabad', state: 'Gujarat', emoji: '🪁', isPopular: true),
  CityInfo(name: 'Ahmednagar', state: 'Maharashtra'),
  CityInfo(name: 'Aizawl', state: 'Mizoram'),
  CityInfo(name: 'Ajmer', state: 'Rajasthan'),
  CityInfo(name: 'Akola', state: 'Maharashtra'),
  CityInfo(name: 'Alappuzha', state: 'Kerala'),
  CityInfo(name: 'Aligarh', state: 'Uttar Pradesh'),
  CityInfo(name: 'Allahabad (Prayagraj)', state: 'Uttar Pradesh'),
  CityInfo(name: 'Alwar', state: 'Rajasthan'),
  CityInfo(name: 'Ambala', state: 'Haryana'),
  CityInfo(name: 'Amravati', state: 'Maharashtra'),
  CityInfo(name: 'Amritsar', state: 'Punjab'),
  CityInfo(name: 'Anand', state: 'Gujarat'),
  CityInfo(name: 'Anantapur', state: 'Andhra Pradesh'),
  CityInfo(name: 'Asansol', state: 'West Bengal'),
  CityInfo(name: 'Aurangabad (Chhatrapati Sambhajinagar)', state: 'Maharashtra'),

  // B
  CityInfo(name: 'Bareilly', state: 'Uttar Pradesh'),
  CityInfo(name: 'Bathinda', state: 'Punjab'),
  CityInfo(name: 'Belgaum (Belagavi)', state: 'Karnataka'),
  CityInfo(name: 'Bellary', state: 'Karnataka'),
  CityInfo(name: 'Bengaluru', state: 'Karnataka', emoji: '🌳', isPopular: true),
  CityInfo(name: 'Bhagalpur', state: 'Bihar'),
  CityInfo(name: 'Bharatpur', state: 'Rajasthan'),
  CityInfo(name: 'Bhavnagar', state: 'Gujarat'),
  CityInfo(name: 'Bhilai', state: 'Chhattisgarh'),
  CityInfo(name: 'Bhilwara', state: 'Rajasthan'),
  CityInfo(name: 'Bhopal', state: 'Madhya Pradesh'),
  CityInfo(name: 'Bhubaneswar', state: 'Odisha'),
  CityInfo(name: 'Bhuj', state: 'Gujarat'),
  CityInfo(name: 'Bidar', state: 'Karnataka'),
  CityInfo(name: 'Bikaner', state: 'Rajasthan'),
  CityInfo(name: 'Bilaspur', state: 'Chhattisgarh'),
  CityInfo(name: 'Bokaro', state: 'Jharkhand'),

  // C
  CityInfo(name: 'Calicut (Kozhikode)', state: 'Kerala'),
  CityInfo(name: 'Chandigarh', state: 'Punjab / Haryana', emoji: '🌹', isPopular: true),
  CityInfo(name: 'Chandrapur', state: 'Maharashtra'),
  CityInfo(name: 'Chennai', state: 'Tamil Nadu', emoji: '🌊', isPopular: true),
  CityInfo(name: 'Chittoor', state: 'Andhra Pradesh'),
  CityInfo(name: 'Coimbatore', state: 'Tamil Nadu'),
  CityInfo(name: 'Cuttack', state: 'Odisha'),

  // D
  CityInfo(name: 'Darbhanga', state: 'Bihar'),
  CityInfo(name: 'Darjeeling', state: 'West Bengal'),
  CityInfo(name: 'Davanagere', state: 'Karnataka'),
  CityInfo(name: 'Dehradun', state: 'Uttarakhand'),
  CityInfo(name: 'Delhi NCR', state: 'National Capital Region', emoji: '🏛️', isPopular: true),
  CityInfo(name: 'Dhanbad', state: 'Jharkhand'),
  CityInfo(name: 'Dharamshala', state: 'Himachal Pradesh'),
  CityInfo(name: 'Dhule', state: 'Maharashtra'),
  CityInfo(name: 'Dibrugarh', state: 'Assam'),
  CityInfo(name: 'Durgapur', state: 'West Bengal'),

  // E
  CityInfo(name: 'Eluru', state: 'Andhra Pradesh'),
  CityInfo(name: 'Erode', state: 'Tamil Nadu'),

  // F
  CityInfo(name: 'Faridabad', state: 'Haryana'),
  CityInfo(name: 'Firozabad', state: 'Uttar Pradesh'),

  // G
  CityInfo(name: 'Gandhidham', state: 'Gujarat'),
  CityInfo(name: 'Gandhinagar', state: 'Gujarat'),
  CityInfo(name: 'Gangtok', state: 'Sikkim'),
  CityInfo(name: 'Gaya', state: 'Bihar'),
  CityInfo(name: 'Ghaziabad', state: 'Uttar Pradesh'),
  CityInfo(name: 'Goa', state: 'Goa', emoji: '🏖️', isPopular: true),
  CityInfo(name: 'Gokarna', state: 'Karnataka'),
  CityInfo(name: 'Gorakhpur', state: 'Uttar Pradesh'),
  CityInfo(name: 'Greater Noida', state: 'Uttar Pradesh'),
  CityInfo(name: 'Gulbarga (Kalaburagi)', state: 'Karnataka'),
  CityInfo(name: 'Guntur', state: 'Andhra Pradesh'),
  CityInfo(name: 'Gurgaon (Gurugram)', state: 'Haryana'),
  CityInfo(name: 'Guwahati', state: 'Assam'),
  CityInfo(name: 'Gwalior', state: 'Madhya Pradesh'),

  // H
  CityInfo(name: 'Haldwani', state: 'Uttarakhand'),
  CityInfo(name: 'Hampi', state: 'Karnataka'),
  CityInfo(name: 'Haridwar', state: 'Uttarakhand'),
  CityInfo(name: 'Hassan', state: 'Karnataka'),
  CityInfo(name: 'Hissar', state: 'Haryana'),
  CityInfo(name: 'Hosur', state: 'Tamil Nadu'),
  CityInfo(name: 'Hubballi-Dharwad', state: 'Karnataka'),
  CityInfo(name: 'Hyderabad', state: 'Telangana', emoji: '💎', isPopular: true),

  // I
  CityInfo(name: 'Imphal', state: 'Manipur'),
  CityInfo(name: 'Indore', state: 'Madhya Pradesh', emoji: '🍔', isPopular: true),
  CityInfo(name: 'Itanagar', state: 'Arunachal Pradesh'),

  // J
  CityInfo(name: 'Jabalpur', state: 'Madhya Pradesh'),
  CityInfo(name: 'Jaipur', state: 'Rajasthan', emoji: '🏰', isPopular: true),
  CityInfo(name: 'Jaisalmer', state: 'Rajasthan'),
  CityInfo(name: 'Jalandhar', state: 'Punjab'),
  CityInfo(name: 'Jalgaon', state: 'Maharashtra'),
  CityInfo(name: 'Jalna', state: 'Maharashtra'),
  CityInfo(name: 'Jammu', state: 'Jammu and Kashmir'),
  CityInfo(name: 'Jamnagar', state: 'Gujarat'),
  CityInfo(name: 'Jamshedpur', state: 'Jharkhand'),
  CityInfo(name: 'Jhansi', state: 'Uttar Pradesh'),
  CityInfo(name: 'Jodhpur', state: 'Rajasthan'),
  CityInfo(name: 'Jorhat', state: 'Assam'),
  CityInfo(name: 'Junagadh', state: 'Gujarat'),

  // K
  CityInfo(name: 'Kakinada', state: 'Andhra Pradesh'),
  CityInfo(name: 'Kalyan-Dombivli', state: 'Maharashtra'),
  CityInfo(name: 'Kanchipuram', state: 'Tamil Nadu'),
  CityInfo(name: 'Kannur', state: 'Kerala'),
  CityInfo(name: 'Kanpur', state: 'Uttar Pradesh'),
  CityInfo(name: 'Kapurthala', state: 'Punjab'),
  CityInfo(name: 'Karnal', state: 'Haryana'),
  CityInfo(name: 'Karur', state: 'Tamil Nadu'),
  CityInfo(name: 'Kasaragod', state: 'Kerala'),
  CityInfo(name: 'Kashipur', state: 'Uttarakhand'),
  CityInfo(name: 'Kharagpur', state: 'West Bengal'),
  CityInfo(name: 'Kochi', state: 'Kerala', emoji: '🌴', isPopular: true),
  CityInfo(name: 'Kohima', state: 'Nagaland'),
  CityInfo(name: 'Kolhapur', state: 'Maharashtra'),
  CityInfo(name: 'Kolkata', state: 'West Bengal', emoji: '🎨', isPopular: true),
  CityInfo(name: 'Kollam', state: 'Kerala'),
  CityInfo(name: 'Korba', state: 'Chhattisgarh'),
  CityInfo(name: 'Kota', state: 'Rajasthan'),
  CityInfo(name: 'Kozhikode', state: 'Kerala'),
  CityInfo(name: 'Kurnool', state: 'Andhra Pradesh'),
  CityInfo(name: 'Kurukshetra', state: 'Haryana'),

  // L
  CityInfo(name: 'Latur', state: 'Maharashtra'),
  CityInfo(name: 'Leh', state: 'Ladakh'),
  CityInfo(name: 'Lonavala', state: 'Maharashtra'),
  CityInfo(name: 'Lucknow', state: 'Uttar Pradesh', emoji: '👑', isPopular: true),
  CityInfo(name: 'Ludhiana', state: 'Punjab'),

  // M
  CityInfo(name: 'Madurai', state: 'Tamil Nadu'),
  CityInfo(name: 'Mahabaleshwar', state: 'Maharashtra'),
  CityInfo(name: 'Malappuram', state: 'Kerala'),
  CityInfo(name: 'Manali', state: 'Himachal Pradesh'),
  CityInfo(name: 'Mandi', state: 'Himachal Pradesh'),
  CityInfo(name: 'Mangaluru', state: 'Karnataka'),
  CityInfo(name: 'Mathura', state: 'Uttar Pradesh'),
  CityInfo(name: 'Meerut', state: 'Uttar Pradesh'),
  CityInfo(name: 'Mirzapur', state: 'Uttar Pradesh'),
  CityInfo(name: 'Mohali', state: 'Punjab'),
  CityInfo(name: 'Moradabad', state: 'Uttar Pradesh'),
  CityInfo(name: 'Mount Abu', state: 'Rajasthan'),
  CityInfo(name: 'Muktsar', state: 'Punjab'),
  CityInfo(name: 'Mumbai', state: 'Maharashtra', emoji: '🏙️', isPopular: true),
  CityInfo(name: 'Muzaffarnagar', state: 'Uttar Pradesh'),
  CityInfo(name: 'Muzaffarpur', state: 'Bihar'),
  CityInfo(name: 'Mysuru', state: 'Karnataka'),

  // N
  CityInfo(name: 'Nadiad', state: 'Gujarat'),
  CityInfo(name: 'Nagercoil', state: 'Tamil Nadu'),
  CityInfo(name: 'Nagpur', state: 'Maharashtra'),
  CityInfo(name: 'Nanded', state: 'Maharashtra'),
  CityInfo(name: 'Nandyal', state: 'Andhra Pradesh'),
  CityInfo(name: 'Nashik', state: 'Maharashtra'),
  CityInfo(name: 'Navi Mumbai', state: 'Maharashtra'),
  CityInfo(name: 'Navsari', state: 'Gujarat'),
  CityInfo(name: 'Neemrana', state: 'Rajasthan'),
  CityInfo(name: 'Nellore', state: 'Andhra Pradesh'),
  CityInfo(name: 'New Delhi', state: 'Delhi'),
  CityInfo(name: 'Nizamabad', state: 'Telangana'),
  CityInfo(name: 'Noida', state: 'Uttar Pradesh'),

  // O
  CityInfo(name: 'Ooty', state: 'Tamil Nadu'),

  // P
  CityInfo(name: 'Palakkad', state: 'Kerala'),
  CityInfo(name: 'Palani', state: 'Tamil Nadu'),
  CityInfo(name: 'Panaji', state: 'Goa'),
  CityInfo(name: 'Panchkula', state: 'Haryana'),
  CityInfo(name: 'Panipat', state: 'Haryana'),
  CityInfo(name: 'Parbhani', state: 'Maharashtra'),
  CityInfo(name: 'Pathankot', state: 'Punjab'),
  CityInfo(name: 'Patiala', state: 'Punjab'),
  CityInfo(name: 'Patna', state: 'Bihar'),
  CityInfo(name: 'Pimpri-Chinchwad', state: 'Maharashtra'),
  CityInfo(name: 'Pollachi', state: 'Tamil Nadu'),
  CityInfo(name: 'Puducherry (Pondicherry)', state: 'Puducherry'),
  CityInfo(name: 'Pune', state: 'Maharashtra', emoji: '🎭', isPopular: true),
  CityInfo(name: 'Puri', state: 'Odisha'),

  // R
  CityInfo(name: 'Rae Bareli', state: 'Uttar Pradesh'),
  CityInfo(name: 'Raichur', state: 'Karnataka'),
  CityInfo(name: 'Raipur', state: 'Chhattisgarh'),
  CityInfo(name: 'Rajahmundry', state: 'Andhra Pradesh'),
  CityInfo(name: 'Rajkot', state: 'Gujarat'),
  CityInfo(name: 'Rameshwaram', state: 'Tamil Nadu'),
  CityInfo(name: 'Ranchi', state: 'Jharkhand'),
  CityInfo(name: 'Ratlam', state: 'Madhya Pradesh'),
  CityInfo(name: 'Ratnagiri', state: 'Maharashtra'),
  CityInfo(name: 'Rewa', state: 'Madhya Pradesh'),
  CityInfo(name: 'Rishikesh', state: 'Uttarakhand'),
  CityInfo(name: 'Rohtak', state: 'Haryana'),
  CityInfo(name: 'Roorkee', state: 'Uttarakhand'),
  CityInfo(name: 'Rourkela', state: 'Odisha'),

  // S
  CityInfo(name: 'Sagar', state: 'Madhya Pradesh'),
  CityInfo(name: 'Saharanpur', state: 'Uttar Pradesh'),
  CityInfo(name: 'Salem', state: 'Tamil Nadu'),
  CityInfo(name: 'Sambalpur', state: 'Odisha'),
  CityInfo(name: 'Sangli', state: 'Maharashtra'),
  CityInfo(name: 'Satara', state: 'Maharashtra'),
  CityInfo(name: 'Satna', state: 'Madhya Pradesh'),
  CityInfo(name: 'Secunderabad', state: 'Telangana'),
  CityInfo(name: 'Shillong', state: 'Meghalaya'),
  CityInfo(name: 'Shimla', state: 'Himachal Pradesh'),
  CityInfo(name: 'Shivamogga', state: 'Karnataka'),
  CityInfo(name: 'Sikar', state: 'Rajasthan'),
  CityInfo(name: 'Silchar', state: 'Assam'),
  CityInfo(name: 'Siliguri', state: 'West Bengal'),
  CityInfo(name: 'Solapur', state: 'Maharashtra'),
  CityInfo(name: 'Sonipat', state: 'Haryana'),
  CityInfo(name: 'Srinagar', state: 'Jammu and Kashmir'),
  CityInfo(name: 'Surat', state: 'Gujarat'),

  // T
  CityInfo(name: 'Tezpur', state: 'Assam'),
  CityInfo(name: 'Thane', state: 'Maharashtra'),
  CityInfo(name: 'Thanjavur', state: 'Tamil Nadu'),
  CityInfo(name: 'Thiruvananthapuram', state: 'Kerala'),
  CityInfo(name: 'Thrissur', state: 'Kerala'),
  CityInfo(name: 'Tiruchirappalli', state: 'Tamil Nadu'),
  CityInfo(name: 'Tirunelveli', state: 'Tamil Nadu'),
  CityInfo(name: 'Tirupati', state: 'Andhra Pradesh'),
  CityInfo(name: 'Tirupur', state: 'Tamil Nadu'),
  CityInfo(name: 'Tumakuru', state: 'Karnataka'),
  CityInfo(name: 'Tuticorin', state: 'Tamil Nadu'),

  // U
  CityInfo(name: 'Udaipur', state: 'Rajasthan'),
  CityInfo(name: 'Udupi', state: 'Karnataka'),
  CityInfo(name: 'Ujjain', state: 'Madhya Pradesh'),
  CityInfo(name: 'Ulhasnagar', state: 'Maharashtra'),

  // V
  CityInfo(name: 'Vadodara', state: 'Gujarat'),
  CityInfo(name: 'Valsad', state: 'Gujarat'),
  CityInfo(name: 'Vapi', state: 'Gujarat'),
  CityInfo(name: 'Varanasi', state: 'Uttar Pradesh'),
  CityInfo(name: 'Vasai-Virar', state: 'Maharashtra'),
  CityInfo(name: 'Vellore', state: 'Tamil Nadu'),
  CityInfo(name: 'Vijayawada', state: 'Andhra Pradesh'),
  CityInfo(name: 'Visakhapatnam', state: 'Andhra Pradesh'),
  CityInfo(name: 'Vizianagaram', state: 'Andhra Pradesh'),

  // W
  CityInfo(name: 'Warangal', state: 'Telangana'),
  CityInfo(name: 'Wayanad', state: 'Kerala'),

  // Y & Z
  CityInfo(name: 'Yamunanagar', state: 'Haryana'),
  CityInfo(name: 'Yavatmal', state: 'Maharashtra'),
  CityInfo(name: 'Zirakpur', state: 'Punjab'),
];
