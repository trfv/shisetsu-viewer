import { graphql, HttpResponse } from "msw";

// GraphQL handlers
export const handlers = [
  // Get Institutions query
  graphql.query("GetInstitutions", () => {
    return HttpResponse.json({
      data: {
        institutions: [
          {
            id: "1",
            name: "中央体育館",
            address: "東京都新宿区西新宿2-8-1",
            municipality: "東京都新宿区",
            capacity: 500,
            facilities: ["駐車場", "エレベーター", "車椅子対応"],
            operatingHours: {
              weekday: { open: "09:00", close: "21:00" },
              weekend: { open: "09:00", close: "18:00" },
            },
          },
          {
            id: "2",
            name: "市民ホール",
            address: "東京都渋谷区渋谷1-1-1",
            municipality: "東京都渋谷区",
            capacity: 300,
            facilities: ["Wi-Fi", "空調", "更衣室"],
            operatingHours: {
              weekday: { open: "10:00", close: "20:00" },
              weekend: { open: "10:00", close: "17:00" },
            },
          },
        ],
      },
    });
  }),

  // Get Reservations query
  graphql.query("GetReservations", () => {
    return HttpResponse.json({
      data: {
        reservations: [
          {
            id: "1",
            institutionId: "1",
            userId: "user1",
            date: "2024-09-25",
            timeSlot: {
              start: "10:00",
              end: "12:00",
            },
            purpose: "バスケットボール練習",
            participants: 15,
            status: "confirmed",
            totalCost: 5000,
          },
          {
            id: "2",
            institutionId: "2",
            userId: "user1",
            date: "2024-09-26",
            timeSlot: {
              start: "14:00",
              end: "16:00",
            },
            purpose: "会議",
            participants: 30,
            status: "pending",
            totalCost: 8000,
          },
        ],
      },
    });
  }),

  // Get Institution by ID query
  graphql.query("GetInstitution", ({ variables }) => {
    const { id } = variables;

    return HttpResponse.json({
      data: {
        institution: {
          id,
          name: "中央体育館",
          address: "東京都新宿区西新宿2-8-1",
          municipality: "東京都新宿区",
          capacity: 500,
          facilities: ["駐車場", "エレベーター", "車椅子対応", "Wi-Fi", "空調"],
          operatingHours: {
            weekday: { open: "09:00", close: "21:00" },
            weekend: { open: "09:00", close: "18:00" },
          },
          description: "市民の健康増進と生涯スポーツの振興を目的とした総合体育施設です。",
          images: [
            { url: "/images/gym1.jpg", caption: "体育館外観" },
            { url: "/images/gym2.jpg", caption: "メインアリーナ" },
          ],
        },
      },
    });
  }),

  // Create Reservation mutation
  graphql.mutation("CreateReservation", ({ variables }) => {
    const { input } = variables;

    return HttpResponse.json({
      data: {
        createReservation: {
          success: true,
          reservation: {
            id: "new-reservation-id",
            ...input,
            status: "pending",
            createdAt: new Date().toISOString(),
          },
        },
      },
    });
  }),

  // Update Reservation mutation
  graphql.mutation("UpdateReservation", ({ variables }) => {
    const { id, input } = variables;

    return HttpResponse.json({
      data: {
        updateReservation: {
          success: true,
          reservation: {
            id,
            ...input,
            updatedAt: new Date().toISOString(),
          },
        },
      },
    });
  }),

  // Cancel Reservation mutation
  graphql.mutation("CancelReservation", ({ variables }) => {
    const { id } = variables;

    return HttpResponse.json({
      data: {
        cancelReservation: {
          success: true,
          reservation: {
            id,
            status: "cancelled",
            cancelledAt: new Date().toISOString(),
          },
        },
      },
    });
  }),

  // Search Institutions query
  graphql.query("SearchInstitutions", ({ variables }) => {
    const { keyword, municipality } = variables;

    // Mock filtering logic
    const results = [
      {
        id: "3",
        name: `${keyword}関連施設`,
        address: `${municipality}1-2-3`,
        municipality,
        capacity: 200,
        availability: true,
      },
    ];

    return HttpResponse.json({
      data: {
        searchInstitutions: results,
      },
    });
  }),
];
