// Test data factory functions without external dependencies
import * as crypto from "crypto";

// Municipality data
const MUNICIPALITIES = [
  "東京都新宿区",
  "東京都渋谷区",
  "東京都港区",
  "東京都千代田区",
  "東京都中央区",
  "東京都文京区",
  "東京都台東区",
  "東京都墨田区",
  "東京都江東区",
  "東京都品川区",
  "東京都目黒区",
  "東京都大田区",
  "東京都世田谷区",
  "東京都杉並区",
  "東京都豊島区",
  "東京都北区",
  "東京都荒川区",
  "東京都板橋区",
  "東京都練馬区",
  "東京都足立区",
  "東京都葛飾区",
  "東京都江戸川区",
];

// Institution types
const INSTITUTION_TYPES = ["sports", "cultural", "educational", "recreational"];

// Facilities
const FACILITIES = [
  "駐車場",
  "エレベーター",
  "車椅子対応",
  "Wi-Fi",
  "空調",
  "更衣室",
  "シャワー室",
  "ロッカー",
  "自動販売機",
  "休憩室",
];

// Helper functions
const generateId = () => {
  const timestamp = Date.now();
  const random = crypto.randomInt(0, 1000000);
  return `id-${timestamp}-${random}`;
};

const randomElement = <T>(array: readonly T[]): T => {
  const index = crypto.randomInt(0, array.length);
  return array[index] as T;
};

const randomElements = <T>(array: T[], min: number, max: number): T[] => {
  const count = crypto.randomInt(min, max + 1);
  const shuffled = [...array].sort(() => crypto.randomInt(0, 2) * 2 - 1);
  return shuffled.slice(0, Math.min(count, array.length));
};

const randomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const randomBoolean = (): boolean => {
  return Math.random() > 0.5;
};

const futureDate = (daysAhead = 30): Date => {
  const date = new Date();
  date.setDate(date.getDate() + randomInt(1, daysAhead));
  return date;
};

const pastDate = (daysBack = 365): Date => {
  const date = new Date();
  date.setDate(date.getDate() - randomInt(1, daysBack));
  return date;
};

const recentDate = (daysBack = 7): Date => {
  const date = new Date();
  date.setDate(date.getDate() - randomInt(0, daysBack));
  return date;
};

// User factory
export const createUser = (overrides = {}) => {
  const id = generateId();
  const randomNum = randomInt(1, 1000);
  return {
    id,
    email: `user${randomNum}@example.com`,
    name: `テストユーザー${randomNum}`,
    role: randomElement(["user", "admin", "guest"]),
    createdAt: pastDate(),
    updatedAt: recentDate(),
    preferences: {
      language: "ja",
      timezone: "Asia/Tokyo",
      notifications: randomBoolean(),
    },
    ...overrides,
  };
};

// Institution factory
export const createInstitution = (overrides = {}) => {
  const facilityNames = [
    "中央体育館",
    "市民ホール",
    "文化センター",
    "総合運動場",
    "図書館",
    "公民館",
    "スポーツセンター",
    "コミュニティセンター",
  ];
  const id = generateId();
  const randomNum = randomInt(1, 100);
  const uniqueSuffix = randomInt(1000, 9999);
  return {
    id,
    name: `${randomElement(facilityNames)}_${uniqueSuffix}`,
    type: randomElement(INSTITUTION_TYPES),
    address: `〇〇市△△町${randomInt(1, 10)}-${randomInt(1, 20)}-${randomInt(1, 30)}`,
    municipality: randomElement(MUNICIPALITIES),
    postalCode: `${randomInt(100, 999)}-${randomInt(1000, 9999)}`,
    capacity: randomInt(10, 500),
    facilities: randomElements(FACILITIES, 3, 7),
    operatingHours: {
      weekday: { open: "09:00", close: "21:00" },
      weekend: { open: "09:00", close: "18:00" },
    },
    description: "テスト用施設の説明文です。この施設では様々な活動が可能です。",
    images: Array.from({ length: randomInt(1, 5) }, (_, i) => ({
      url: `/images/facility-${id}-${i + 1}.jpg`,
      caption: `施設画像 ${i + 1}`,
    })),
    contactInfo: {
      phone: `03-${randomInt(1000, 9999)}-${randomInt(1000, 9999)}`,
      email: `facility${randomNum}@example.com`,
      website: `https://facility${randomNum}.example.com`,
    },
    ...overrides,
  };
};

// Reservation factory
export const createReservation = (overrides = {}) => {
  const purposes = [
    "スポーツ練習",
    "文化活動",
    "会議",
    "イベント",
    "教育",
    "研修",
    "発表会",
    "展示会",
  ];
  const startTimes = ["09:00", "10:00", "13:00", "15:00", "17:00"];
  const endTimes = ["11:00", "12:00", "15:00", "17:00", "19:00"];
  const statuses = ["pending", "confirmed", "cancelled", "completed"];

  return {
    id: generateId(),
    userId: generateId(),
    institutionId: generateId(),
    date: futureDate(),
    timeSlot: {
      start: randomElement(startTimes),
      end: randomElement(endTimes),
    },
    purpose: randomElement(purposes),
    participants: randomInt(1, 100),
    status: randomElement(statuses),
    totalCost: randomInt(1000, 50000),
    createdAt: pastDate(),
    updatedAt: recentDate(),
    ...overrides,
  };
};

// Scenario builders
export const scenarios = {
  // Create a complete user journey dataset
  userWithReservations: (count = 5) => {
    const user = createUser();
    const institutions = Array.from({ length: 3 }, () => createInstitution());
    const reservations = institutions.flatMap((institution) =>
      Array.from({ length: count }, () =>
        createReservation({
          userId: user.id,
          institutionId: institution.id,
        })
      )
    );

    return { user, institutions, reservations };
  },

  // Create institution with availability
  institutionWithAvailability: () => {
    const institution = createInstitution();
    const today = new Date();
    const availability = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() + i);

      const slots = [
        { start: "09:00", end: "11:00", available: randomBoolean() },
        { start: "11:00", end: "13:00", available: randomBoolean() },
        { start: "13:00", end: "15:00", available: randomBoolean() },
        { start: "15:00", end: "17:00", available: randomBoolean() },
        { start: "17:00", end: "19:00", available: randomBoolean() },
        { start: "19:00", end: "21:00", available: randomBoolean() },
      ];

      return {
        date: date.toISOString(),
        slots,
      };
    });

    return { institution, availability };
  },

  // Generate test data for pagination
  paginatedData: <T>(factory: () => T, { page = 1, limit = 10, total = 100 } = {}) => {
    const allData = Array.from({ length: total }, factory);
    const start = (page - 1) * limit;
    const data = allData.slice(start, start + limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  },

  // Create search results
  searchResults: (keyword: string, municipality?: string) => {
    const count = randomInt(0, 20);
    const results = Array.from({ length: count }, () => {
      const institution = createInstitution({
        municipality: municipality || randomElement(MUNICIPALITIES),
      });

      // Make the name include the keyword if provided
      if (keyword) {
        institution.name = `${keyword}${institution.name}`;
      }

      return institution;
    });

    return {
      keyword,
      municipality,
      results,
      totalCount: count,
    };
  },
};

// Edge case generators
export const edgeCases = {
  emptyStrings: ["", " ", "　", "\n", "\t"],

  longStrings: [
    "これは非常に長いテキストです。".repeat(100),
    "a".repeat(10000),
    "漢字".repeat(5000),
  ],

  specialCharacters: [
    '<script>alert("XSS")</script>',
    '"; DROP TABLE users; --',
    "../../etc/passwd",
    "javascript:alert(1)",
    "����",
  ],

  boundaryNumbers: [
    0,
    -1,
    1,
    Number.MAX_SAFE_INTEGER,
    Number.MIN_SAFE_INTEGER,
    Infinity,
    -Infinity,
    NaN,
  ],

  dates: {
    past: new Date("1900-01-01"),
    future: new Date("2100-12-31"),
    invalid: new Date("invalid"),
    timezone: [
      new Date("2024-03-31T23:59:59Z"), // DST boundary
      new Date("2024-10-27T02:00:00Z"), // DST boundary
    ],
  },
};

// Mock data for specific test cases
export const mockData = {
  defaultUser: createUser({
    id: "test-user-1",
    email: "test@example.com",
    name: "テストユーザー",
    role: "user",
  }),

  adminUser: createUser({
    id: "admin-user-1",
    email: "admin@example.com",
    name: "管理者",
    role: "admin",
  }),

  defaultInstitution: createInstitution({
    id: "inst-1",
    name: "中央体育館",
    municipality: "東京都新宿区",
    capacity: 500,
  }),

  pendingReservation: createReservation({
    id: "res-1",
    status: "pending",
    date: new Date("2024-09-25"),
  }),

  confirmedReservation: createReservation({
    id: "res-2",
    status: "confirmed",
    date: new Date("2024-09-26"),
  }),
};
