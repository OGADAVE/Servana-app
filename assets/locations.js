// ═══════════════════════════════════════════════════════
// SERVANA — Location Data
// Countries: Nigeria, Ghana, Kenya, South Africa,
//            Uganda, Cameroon, Egypt
// Structure: Country → State/Region → City/Town
// ═══════════════════════════════════════════════════════

export const LOCATION_DATA = {

  // ─────────────────────────────────────────────────────
  // 🇳🇬 NIGERIA
  // ─────────────────────────────────────────────────────
  "Nigeria": {
    "Abuja (FCT)": [
      "Abuja","Garki","Wuse","Maitama","Asokoro","Gwarinpa",
      "Kubwa","Lugbe","Nyanya","Karu","Gwagwalada","Bwari",
      "Kuje","Abaji","Dutse","Jabi","Utako","Wuse II","Life Camp"
    ],
    "Lagos": [
      "Lagos Island","Ikeja","Victoria Island","Lekki","Surulere",
      "Yaba","Ikorodu","Badagry","Epe","Alimosho","Oshodi","Mushin",
      "Ajegunle","Apapa","Ojuelegba","Ojo","Agege","Shomolu",
      "Kosofe","Magodo","Maryland","Gbagada","Ajah","Sangotedo",
      "Chevron","Ogudu","Ojota","Mile 12","Festac Town"
    ],
    "Rivers": [
      "Port Harcourt","Obio-Akpor","Eleme","Ikwerre","Bonny",
      "Ogu-Bolo","Oyigbo","Khana","Tai","Gokana","Ahoada",
      "Degema","Asari-Toru","Etche","Rumuola","GRA Port Harcourt"
    ],
    "Kano": [
      "Kano City","Bichi","Gwarzo","Kura","Rano","Nassarawa",
      "Fagge","Dala","Gwale","Tarauni","Ungogo","Tofa",
      "Sumaila","Rogo","Kunchi","Wudil"
    ],
    "Oyo": [
      "Ibadan","Ogbomoso","Oyo","Iseyin","Saki","Eruwa",
      "Igbo-Ora","Okeho","Lalupon","Fiditi","Lanlate",
      "Igboho","Kishi","Ago-Are"
    ],
    "Anambra": [
      "Awka","Onitsha","Nnewi","Ekwulobia","Agulu","Ihiala",
      "Ogidi","Ukpor","Oba","Ozubulu","Abagana","Nteje",
      "Nkpor","Awka-Etiti","Obosi","Oguta"
    ],
    "Enugu": [
      "Enugu","Nsukka","Oji River","Udi","Igbo-Eze","Agbani",
      "Ninth Mile","Opi","Ohebe-Dim","Eha-Amufu","Oji"
    ],
    "Delta": [
      "Asaba","Warri","Sapele","Ughelli","Agbor","Abraka",
      "Ozoro","Ogwashi-Uku","Burutu","Koko","Oleh","Kwale",
      "Eku","Effurun"
    ],
    "Edo": [
      "Benin City","Auchi","Ekpoma","Uromi","Ubiaja","Igarra",
      "Igueben","Afuze","Sabongida-Ora","Okpella","Ibillo"
    ],
    "Imo": [
      "Owerri","Orlu","Okigwe","Oguta","Nnokwa","Mbaitoli",
      "Nkwerre","Obowo","Ehime Mbano","Ihitte-Uboma"
    ],
    "Kaduna": [
      "Kaduna","Zaria","Kafanchan","Kagoro","Saminaka","Zonkwa",
      "Kagarko","Birnin Gwari","Kaura","Lere"
    ],
    "Borno": [
      "Maiduguri","Biu","Gwoza","Konduga","Bama","Dikwa",
      "Monguno","Ngala","Damboa","Chibok"
    ],
    "Cross River": [
      "Calabar","Ikom","Obudu","Ogoja","Obubra","Ugep",
      "Calabar South","Akamkpa","Boki","Bekwara"
    ],
    "Akwa Ibom": [
      "Uyo","Eket","Ikot Ekpene","Oron","Abak","Etinan",
      "Itu","Ikot Abasi","Mkpat-Enin","Ibeno"
    ],
    "Bayelsa": [
      "Yenagoa","Brass","Ogbia","Nembe","Ekeremor","Sagbama",
      "Southern Ijaw","Kolokuma-Opokuma"
    ],
    "Kwara": [
      "Ilorin","Offa","Oke-Ero","Omu-Aran","Patigi","Kaiama",
      "Lafiagi","Share","Oro","Ajase-Ipo"
    ],
    "Osun": [
      "Osogbo","Ile-Ife","Ilesa","Ede","Iwo","Ejigbo",
      "Ikire","Ikirun","Inisa","Ila-Orangun"
    ],
    "Ondo": [
      "Akure","Ondo City","Owo","Okitipupa","Ikare","Ilaro",
      "Ore","Igbokoda","Ile-Oluji","Ose"
    ],
    "Ekiti": [
      "Ado-Ekiti","Ikere","Oye","Ijero","Aramoko","Ikole",
      "Omuo","Efon-Alaaye","Ode","Ilawe"
    ],
    "Ogun": [
      "Abeokuta","Sagamu","Ijebu-Ode","Ilishan","Ota","Mowe",
      "Ijebu-Igbo","Ilaro","Owode","Iperu"
    ],
    "Plateau": [
      "Jos","Bukuru","Shendam","Pankshin","Barkin Ladi",
      "Langtang","Riyom","Qua'an Pan","Bassa"
    ],
    "Niger": [
      "Minna","Bida","Suleja","Kontagora","Lapai","Agaie",
      "Mokwa","New Bussa","Kutigi","Rijau"
    ],
    "Kogi": [
      "Lokoja","Okene","Idah","Ankpa","Kabba","Ajaokuta",
      "Ogaminana","Isanlu","Okene","Obangede"
    ],
    "Benue": [
      "Makurdi","Gboko","Otukpo","Katsina-Ala","Vandeikya",
      "Oju","Obi","Ado","Agatu","Gwer"
    ],
    "Abia": [
      "Umuahia","Aba","Arochukwu","Ohafia","Bende","Isuikwuato",
      "Ugwunagbo","Ukwa","Isiala Ngwa"
    ],
    "Ebonyi": [
      "Abakaliki","Afikpo","Edda","Amasiri","Ezza","Ikwo",
      "Ishielu","Ohaozara","Onicha"
    ],
    "Nasarawa": [
      "Lafia","Keffi","Nasarawa","Akwanga","Awe","Doma",
      "Kokona","Obi","Wamba"
    ],
    "Adamawa": [
      "Yola","Mubi","Numan","Ganye","Gombi","Hong",
      "Madagali","Maiha","Michika","Song"
    ],
    "Gombe": [
      "Gombe","Kumo","Kaltungo","Billiri","Dukku","Nafada",
      "Funakaye","Balanga","Kwami"
    ],
    "Taraba": [
      "Jalingo","Wukari","Bali","Takum","Zing","Serti",
      "Lau","Ibi","Gashaka"
    ],
    "Yobe": [
      "Damaturu","Potiskum","Nguru","Gashua","Geidam",
      "Jakusko","Yunusari","Bade"
    ],
    "Sokoto": [
      "Sokoto","Tambuwal","Wurno","Bodinga","Gwadabawa",
      "Illela","Kebbe","Rabah","Shagari"
    ],
    "Kebbi": [
      "Birnin Kebbi","Argungu","Yauri","Zuru","Jega",
      "Kamba","Bagudo","Bunza","Kalgo"
    ],
    "Zamfara": [
      "Gusau","Talata-Mafara","Kaura-Namoda","Anka","Bakura",
      "Bungudu","Birnin Magaji","Maradun"
    ],
    "Jigawa": [
      "Dutse","Hadejia","Gumel","Kazaure","Birniwa",
      "Gagarawa","Kaugama","Mallam Madori"
    ],
    "Bauchi": [
      "Bauchi","Azare","Misau","Katagum","Gamawa",
      "Kirfi","Darazo","Ganjuwa","Tafawa Balewa"
    ],
    "Katsina": [
      "Katsina","Daura","Funtua","Malumfashi","Kankia",
      "Dutsinma","Jibia","Rimi","Charanchi"
    ],
    "Kebbi (State)": [
      "Birnin Kebbi","Argungu","Yauri","Zuru","Jega"
    ]
  },

  // ─────────────────────────────────────────────────────
  // 🇬🇭 GHANA
  // ─────────────────────────────────────────────────────
  "Ghana": {
    "Greater Accra": [
      "Accra","Tema","Madina","Adenta","Ashaiman","Korle-Bu",
      "Dansoman","Osu","Cantonments","East Legon","Labone",
      "Airport Residential","Roman Ridge","Spintex","Teshie",
      "Nungua","La","Dome","Achimota","Abeka"
    ],
    "Ashanti": [
      "Kumasi","Obuasi","Ejisu","Konongo","Mampong","Juaben",
      "Bekwai","Asante Mampong","Offinso","Kenyasi",
      "Adum","Bantama","Nhyiaeso","Suame","Asokwa"
    ],
    "Western": [
      "Takoradi","Sekondi","Cape Coast","Tarkwa","Axim",
      "Prestea","Half Assini","Elubo","Shama","Essipon"
    ],
    "Central": [
      "Cape Coast","Kasoa","Winneba","Mankessim","Swedru",
      "Saltpond","Elmina","Anomabo","Assin Fosu","Dunkwa"
    ],
    "Eastern": [
      "Koforidua","Nkawkaw","Nsawam","Akim Oda","Aburi",
      "Akosombo","Suhum","Begoro","Asamankese","Kibi"
    ],
    "Northern": [
      "Tamale","Yendi","Savelugu","Bimbilla","Kpandai",
      "Gushegu","Karaga","Mion","Nanumba"
    ],
    "Upper East": [
      "Bolgatanga","Navrongo","Bawku","Zebilla","Bongo",
      "Builsa North","Builsa South","Kassena-Nankana"
    ],
    "Upper West": [
      "Wa","Lawra","Jirapa","Tumu","Nandom",
      "Sissala East","Sissala West","Daffiama"
    ],
    "Volta": [
      "Ho","Hohoe","Keta","Aflao","Kpando","Sogakope",
      "Akatsi","Denu","Adidome","Jasikan"
    ],
    "Bono": [
      "Sunyani","Berekum","Dormaa Ahenkro","Wenchi",
      "Techiman","Nkoranza","Atebubu"
    ],
    "Oti": ["Dambai","Nkwanta","Jasikan","Kadjebi"],
    "Ahafo": ["Goaso","Kenyasi","Hwidiem","Kukuom"],
    "Savannah": ["Damongo","Salaga","Bole","Sawla"],
    "North East": ["Nalerigu","Gambaga","Walewale","Chereponi"],
    "Western North": ["Sefwi-Wiawso","Bibiani","Juaboso","Bia East"],
    "Bono East": ["Techiman","Nkoranza","Kintampo","Atebubu"]
  },

  // ─────────────────────────────────────────────────────
  // 🇰🇪 KENYA
  // ─────────────────────────────────────────────────────
  "Kenya": {
    "Nairobi": [
      "Nairobi CBD","Westlands","Eastleigh","Karen","Langata",
      "Embakasi","Kasarani","Ruaraka","Dagoretti","Mathare",
      "Kibera","Kilimani","Lavington","Upperhill","Gigiri",
      "Runda","Muthaiga","South C","South B","Buruburu",
      "Donholm","Umoja","Kayole","Githurai","Ruiru (border)"
    ],
    "Mombasa": [
      "Mombasa Island","Nyali","Bamburi","Likoni","Kisauni",
      "Changamwe","Jomvu","Miritini","Port Reitz"
    ],
    "Kisumu": [
      "Kisumu CBD","Kondele","Mamboleo","Nyalenda","Manyatta",
      "Milimani","Bandani","Migosi","Lolwe","Kolwa"
    ],
    "Nakuru": [
      "Nakuru City","Naivasha","Gilgil","Molo","Njoro",
      "Rongai","Subukia","Bahati","Kuresoi"
    ],
    "Uasin Gishu (Eldoret)": [
      "Eldoret","Turbo","Moiben","Ainabkoi","Kapseret","Soy"
    ],
    "Kiambu": [
      "Thika","Ruiru","Kikuyu","Limuru","Kiambu Town",
      "Karuri","Githunguri","Gatundu","Kabete","Lari"
    ],
    "Machakos": [
      "Machakos","Athi River","Kitengela","Mavoko",
      "Kangundo","Kathiani","Mwala","Yatta"
    ],
    "Kajiado": [
      "Kajiado","Ngong","Ongata Rongai","Kitengela",
      "Namanga","Loitokitok","Magadi","Bissil"
    ],
    "Nyeri": ["Nyeri","Karatina","Othaya","Mukurweini","Tetu"],
    "Meru": ["Meru","Nkubu","Makutano","Maua","Timau","Chuka"],
    "Kilifi": ["Malindi","Kilifi","Mtwapa","Watamu","Kaloleni"],
    "Kwale": ["Kwale","Ukunda","Diani","Msambweni","Kinango"],
    "Embu": ["Embu","Runyenjes","Siakago","Ishiara"],
    "Kakamega": ["Kakamega","Mumias","Butere","Lugari","Khwisero"],
    "Kericho": ["Kericho","Litein","Kipkelion","Bureti"],
    "Bomet": ["Bomet","Sotik","Longisa","Mulot"],
    "Bungoma": ["Bungoma","Webuye","Kimilili","Chwele"],
    "Siaya": ["Siaya","Bondo","Ugunja","Yala","Ukwala"],
    "Homa Bay": ["Homa Bay","Kendu Bay","Oyugis","Ndhiwa"],
    "Trans Nzoia": ["Kitale","Kiminini","Saboti","Kwanza"]
  },

  // ─────────────────────────────────────────────────────
  // 🇿🇦 SOUTH AFRICA
  // ─────────────────────────────────────────────────────
  "South Africa": {
    "Gauteng": [
      "Johannesburg","Pretoria","Soweto","Sandton","Midrand",
      "Centurion","Kempton Park","Boksburg","Benoni","Springs",
      "Germiston","Edenvale","Fourways","Randburg","Roodepoort",
      "Tembisa","Thembisa","Ekurhuleni","Alberton","Vereeniging"
    ],
    "Western Cape": [
      "Cape Town","Stellenbosch","Somerset West","Paarl","George",
      "Knysna","Mossel Bay","Bellville","Mitchells Plain",
      "Khayelitsha","Claremont","Sea Point","Wynberg","Constantia",
      "Hermanus","Swellendam","Oudtshoorn","Worcester"
    ],
    "KwaZulu-Natal": [
      "Durban","Pietermaritzburg","Richards Bay","Newcastle",
      "Umhlanga","Ballito","Pinetown","Umlazi","KwaMashu",
      "Empangeni","Eshowe","Stanger","Tongaat","Amanzimtoti"
    ],
    "Eastern Cape": [
      "Port Elizabeth (Gqeberha)","East London","Bhisho","Mthatha",
      "Uitenhage","Queenstown","King William's Town","Mdantsane",
      "Butterworth","Grahamstown (Makhanda)","Jeffrey's Bay"
    ],
    "Limpopo": [
      "Polokwane","Tzaneen","Mokopane","Bela-Bela","Phalaborwa",
      "Louis Trichardt","Musina","Thohoyandou","Lebowakgomo"
    ],
    "Mpumalanga": [
      "Nelspruit (Mbombela)","Witbank (eMalahleni)","Secunda",
      "Middelburg","Standerton","Bethal","Ermelo","Barberton"
    ],
    "North West": [
      "Rustenburg","Mahikeng","Klerksdorp","Potchefstroom",
      "Brits","Lichtenburg","Vryburg","Zeerust","Orkney"
    ],
    "Free State": [
      "Bloemfontein","Welkom","Kroonstad","Sasolburg",
      "Phuthaditjhaba","Botshabelo","Bethlehem","Harrismith"
    ],
    "Northern Cape": [
      "Kimberley","Upington","Springbok","De Aar","Kuruman",
      "Calvinia","Colesberg","Beaufort West"
    ]
  },

  // ─────────────────────────────────────────────────────
  // 🇺🇬 UGANDA
  // ─────────────────────────────────────────────────────
  "Uganda": {
    "Kampala": [
      "Kampala City Centre","Kawempe","Makindye","Nakawa",
      "Rubaga","Kololo","Ntinda","Bukoto","Kisaasi","Najjera",
      "Kira","Nansana","Bweyogerere","Kyaliwajjala","Kireka"
    ],
    "Wakiso": [
      "Entebbe","Nansana","Kira","Makindye Ssabagabo",
      "Ssabagabo","Kajjansi","Kasangati","Wakiso Town",
      "Buloba","Kakiri","Busukuma"
    ],
    "Gulu": [
      "Gulu City","Layibi","Bardege","Pece","Laroo","Lacor"
    ],
    "Mbarara": [
      "Mbarara City","Kakoba","Kamukuzi","Nyamitanga","Biharwe"
    ],
    "Jinja": [
      "Jinja City","Walukuba","Mpumudde","Kimaka","Butembe"
    ],
    "Mbale": [
      "Mbale City","Nakaloke","Bugembe","Wanale","Industrial Area"
    ],
    "Masaka": [
      "Masaka City","Nyendo","Katwe","Kimanya","Kabonera"
    ],
    "Fort Portal": [
      "Fort Portal City","Kabarole","Kichwamba","Burahya"
    ],
    "Lira": [
      "Lira City","Ojwina","Railway","Adyel","Central Division"
    ],
    "Arua": [
      "Arua City","River Oli","Ayivu","Vurra","Pajulu"
    ],
    "Soroti": ["Soroti City","Gweri","Opeta","Arapai"],
    "Tororo": ["Tororo","Magola","Mukuju","Paya"],
    "Kasese": ["Kasese","Hima","Bwera","Katwe-Kabatoro"],
    "Hoima": ["Hoima","Buseruka","Kiziranfumbi","Kaiso"],
    "Kabale": ["Kabale","Maziba","Bufundi","Kaharo"]
  },

  // ─────────────────────────────────────────────────────
  // 🇨🇲 CAMEROON
  // ─────────────────────────────────────────────────────
  "Cameroon": {
    "Centre": [
      "Yaoundé","Obala","Bafia","Mbalmayo","Eseka",
      "Nanga-Eboko","Mfou","Akonolinga","Okoa","Ntui"
    ],
    "Littoral": [
      "Douala","Nkongsamba","Edéa","Yabassi","Loum",
      "Mbanga","Manjo","Melong","Ngambé","Penja"
    ],
    "West": [
      "Bafoussam","Dschang","Mbouda","Bafang","Foumban",
      "Nkongsamba","Melong","Bangangté","Foumbot","Baham"
    ],
    "South West": [
      "Buea","Limbe","Kumba","Mamfe","Mundemba",
      "Tiko","Mutengene","Ekona","Idenau","Muyuka"
    ],
    "North West": [
      "Bamenda","Kumbo","Wum","Nkambe","Fundong",
      "Mbengwi","Ndop","Bali","Batibo","Santa"
    ],
    "South": [
      "Ebolowa","Kribi","Sangmelima","Ambam","Lolodorf",
      "Djoum","Mengong","Mvangane"
    ],
    "East": [
      "Bertoua","Batouri","Abong-Mbang","Belabo","Doumé",
      "Yokadouma","Moloundou","Ngoura"
    ],
    "North": [
      "Garoua","Guider","Pitoa","Bibemi","Figuil",
      "Lagdo","Poli","Rey Bouba"
    ],
    "Far North": [
      "Maroua","Kousseri","Mora","Yagoua","Kaélé",
      "Mokolo","Kousséri","Waza","Kolofata"
    ],
    "Adamawa": [
      "Ngaoundéré","Meiganga","Tibati","Banyo","Tignère",
      "Kontcha","Nganha","Mbe"
    ]
  },

  // ─────────────────────────────────────────────────────
  // 🇪🇬 EGYPT
  // ─────────────────────────────────────────────────────
  "Egypt": {
    "Cairo": [
      "Cairo City","New Cairo","Maadi","Zamalek","Nasr City",
      "Heliopolis","Shubra","Ain Shams","Helwan","New Heliopolis",
      "Fifth Settlement","Rehab City","Katameya","Mokattam",
      "Manial","Garden City","Dokki","Agouza","Faisal"
    ],
    "Giza": [
      "Giza City","6th of October","Sheikh Zayed","Haram",
      "Warraq","Abu Rawash","Imbaba","Bulaq Dakrour",
      "Omraneya","Kerdasa","Hawamdeyya"
    ],
    "Alexandria": [
      "Alexandria City","Borg El Arab","Agami","Montazah",
      "Sidi Gaber","Smouha","Raml Station","Mansheya",
      "Kafr Abdo","Roushdy","Stanley","Gleem","Loran"
    ],
    "Dakahlia": [
      "Mansoura","Talkha","Mit Ghamr","Aga","Beni Ebeid",
      "Dekernes","Manzala","Sherbin","Sinbillawein"
    ],
    "Sharqia": [
      "Zagazig","10th of Ramadan","Belbeis","Minya El Qamh",
      "Faqous","Abou Hammad","El Husaineya","Hehya"
    ],
    "Qalyubia": [
      "Benha","Shubra El Kheima","Obour","Qalyub","Khanka",
      "Qaha","Toukh","Quesna","Abu Zaabal"
    ],
    "Gharbia": [
      "Tanta","El Mahalla El Kubra","Kafr El Zayat","Zefta",
      "Samanoud","El Santa","Basyoun"
    ],
    "Monufia": [
      "Shebin El Koum","Sadat City","Menouf","Ashmoun",
      "Berket El Sab","Tala","Bagour"
    ],
    "Ismailia": [
      "Ismailia","Fayed","Qantara","Abu Khalifa","El Tal El Kabir"
    ],
    "Suez": [
      "Suez City","Ataqah","El Ganayen","Port Tawfiq","Ain Sokhna"
    ],
    "Port Said": [
      "Port Said","Port Fouad","El Arab","Zohour","El Manakh"
    ],
    "Luxor": [
      "Luxor City","Karnak","Qurna","Esna","Armant","New Gurna"
    ],
    "Aswan": [
      "Aswan City","Kom Ombo","Edfu","Abu Simbel","Idfu","Daraw"
    ],
    "Assiut": [
      "Assiut City","Dairut","Manfalut","Qusiya","Abnoub","El Badari"
    ],
    "Sohag": [
      "Sohag City","Akhmim","Tahta","Girga","Tema","El Maragha"
    ],
    "Qena": [
      "Qena City","Nag Hammadi","Quseir","Farshout","Dishna"
    ],
    "Red Sea": [
      "Hurghada","Sharm El Sheikh","El Gouna","Marsa Alam",
      "Safaga","El Qoseir","Dahab","Nuweiba"
    ],
    "Kafr El Sheikh": [
      "Kafr El Sheikh","Desouk","Baltim","Fuwwah","Sidi Salem"
    ],
    "Beheira": [
      "Damanhur","Kafr El Dawwar","Rashid","Abu Hummus",
      "Edko","Hosh Issa","El Delengat"
    ],
    "Minya": [
      "Minya City","Mallawi","Assiut Minya","Samalut",
      "Abu Qurqas","Matay","Beni Mazar"
    ],
    "Fayoum": [
      "Fayoum City","Ibshaway","Sinnuris","Tamiya","Yusuf El Seddiq"
    ],
    "Beni Suef": [
      "Beni Suef City","Beba","El Fashn","Nasser","Ihnasya El Madina"
    ]
  }
};

// ── Helper: Get all country names ────────────────────────
export const COUNTRIES = Object.keys(LOCATION_DATA);

// ── Helper: Get states/regions for a country ─────────────
export function getStates(country) {
  return country && LOCATION_DATA[country]
    ? Object.keys(LOCATION_DATA[country])
    : [];
}

// ── Helper: Get cities for a country + state ─────────────
export function getCities(country, state) {
  return country && state && LOCATION_DATA[country]?.[state]
    ? LOCATION_DATA[country][state]
    : [];
}

// ── Build a flat list of major cities for search dropdowns ─
// Format: "City, State, Country" — deduplicated, sorted by country
export function buildSearchOptions() {
  const options = [];
  for (const [country, states] of Object.entries(LOCATION_DATA)) {
    for (const [state, cities] of Object.entries(states)) {
      cities.forEach(city => {
        options.push({ label: `${city}, ${state}`, value: city, country, state });
      });
    }
  }
  return options;
}

/**
 * Wire up a 3-level cascading location selector.
 * Populates state select when country changes,
 * and city select when state changes.
 *
 * @param {HTMLSelectElement} countryEl  - Country dropdown
 * @param {HTMLSelectElement} stateEl    - State/Region dropdown
 * @param {HTMLSelectElement} cityEl     - City/Town dropdown
 * @param {object}            defaults   - { country, state, city } pre-selected values
 */
export function wireCascade(countryEl, stateEl, cityEl, defaults = {}) {
  function populateStates(country) {
    stateEl.innerHTML = `<option value="">Select state/region</option>`;
    cityEl.innerHTML  = `<option value="">Select city/town</option>`;
    stateEl.disabled  = !country;
    cityEl.disabled   = true;
    if (!country) return;
    getStates(country).forEach(s => {
      const opt = document.createElement("option");
      opt.value = s; opt.textContent = s;
      if (s === defaults.state) opt.selected = true;
      stateEl.appendChild(opt);
    });
    stateEl.disabled = false;
  }

  function populateCities(country, state) {
    cityEl.innerHTML = `<option value="">Select city/town</option>`;
    cityEl.disabled  = !state;
    if (!state) return;
    getCities(country, state).forEach(c => {
      const opt = document.createElement("option");
      opt.value = c; opt.textContent = c;
      if (c === defaults.city) opt.selected = true;
      cityEl.appendChild(opt);
    });
    cityEl.disabled = false;
  }

  // Populate countries
  countryEl.innerHTML = `<option value="">Select country</option>`;
  COUNTRIES.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c; opt.textContent = c;
    if (c === defaults.country) opt.selected = true;
    countryEl.appendChild(opt);
  });

  // If defaults provided, pre-populate states and cities
  if (defaults.country) {
    populateStates(defaults.country);
    if (defaults.state) populateCities(defaults.country, defaults.state);
  }

  // Event listeners
  countryEl.addEventListener("change", () => populateStates(countryEl.value));
  stateEl.addEventListener("change",   () => populateCities(countryEl.value, stateEl.value));
}

/**
 * Build an HTML <select> with <optgroup> for each country
 * — used in search bars where a single dropdown is preferred.
 *
 * @param {string} selectedValue  - Currently selected city name
 * @returns {string}              - HTML option strings
 */
export function buildSearchSelectHtml(selectedValue = "") {
  let html = `<option value="">All Locations</option>`;
  for (const [country, states] of Object.entries(LOCATION_DATA)) {
    html += `<optgroup label="🌍 ${country}">`;
    const seen = new Set();
    for (const cities of Object.values(states)) {
      cities.forEach(city => {
        if (!seen.has(city)) {
          seen.add(city);
          const sel = city === selectedValue ? " selected" : "";
          html += `<option value="${city}"${sel}>${city}</option>`;
        }
      });
    }
    html += `</optgroup>`;
  }
  return html;
}

/**
 * Get a formatted location string from 3 select elements
 * @returns {string}  e.g. "Lekki, Lagos, Nigeria"
 */
export function getLocationString(countryEl, stateEl, cityEl) {
  const parts = [cityEl?.value, stateEl?.value, countryEl?.value].filter(Boolean);
  return parts.join(", ");
}
