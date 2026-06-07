import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { faker } from "@faker-js/faker";

import User from "./models/User.js";
import Parking from "./models/Parking.js";
import Booking from "./models/Booking.js";
import ParkingLog from "./models/ParkingLog.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

// Define specific static user templates
const staticUsers = [
  {
    name: "Alice Sharma",
    email: "alice@demo.com",
    password: "Demo@1234",
    role: "user",
    favorites: [],
  },
  {
    name: "Super Admin",
    email: "admin@demo.com",
    password: "Admin@1234",
    role: "admin",
    favorites: [],
  },
  {
    name: "Bob Reset",
    email: "reset.pending@demo.com",
    password: "OldPass@1234",
    role: "user",
    resetToken: "abc123deadbeefcafe0011223344556677889900aabbccddeeff00112233445566",
    resetTokenExpiry: new Date("2099-01-01T00:00:00.000Z"),
    favorites: [],
  },
  {
    name: "Carol Expired",
    email: "reset.expired@demo.com",
    password: "OldPass@1234",
    role: "user",
    resetToken: "expiredtoken0011223344556677889900aabbccddeeff00112233445566778899",
    resetTokenExpiry: new Date("2020-01-01T00:00:00.000Z"),
    favorites: [],
  },
  {
    name: null,
    email: "noname@demo.com",
    password: "Demo@1234",
    role: "user",
    favorites: [],
  },
  {
    name: "Power Favoriter",
    email: "power.favorites@demo.com",
    password: "Demo@1234",
    role: "user",
    favorites: [],
  },
  {
    name: "Zero Faves",
    email: "zero.faves@demo.com",
    password: "Demo@1234",
    role: "user",
    favorites: [],
  },
  {
    name: "New User Empty",
    email: "newbie@demo.com",
    password: "Demo@1234",
    role: "user",
    favorites: [],
  },
];

// Define specific static parking lots
const staticParkingLots = [
  {
    name: "Fully Occupied Lot",
    location: "Connaught Place, Delhi",
    pricePerHour: 45,
    status: "occupied",
    distance: "2km",
    capacity: 100,
    availableSlots: 0,
    isCovered: true,
    securityLevel: "high",
    rating: 4.1,
    openingTime: "06:00 AM",
    closingTime: "11:00 PM",
  },
  {
    name: "Under Repair Garage",
    location: "Bandra, Mumbai",
    pricePerHour: 0,
    status: "maintenance",
    distance: "4km",
    capacity: 200,
    availableSlots: 0,
    isCovered: true,
    securityLevel: "medium",
    rating: 3.0,
    openingTime: "N/A",
    closingTime: "N/A",
  },
  {
    name: "Super Ultra Premium Covered Multi-Level Automated Smart Parking Facility — Phase III Extension Wing North Block",
    location: "Whitefield IT Corridor, Outer Ring Road, Bangalore, Karnataka 560066, India",
    pricePerHour: 75,
    status: "available",
    distance: "8km",
    capacity: 600,
    availableSlots: 300,
    isCovered: true,
    securityLevel: "high",
    rating: 4.9,
    openingTime: "05:30 AM",
    closingTime: "11:59 PM",
  },
  {
    name: "Zero Slots But Open",
    location: "Sarojini Nagar, Delhi",
    pricePerHour: 20,
    status: "available",
    distance: "2km",
    capacity: 50,
    availableSlots: 0,
    isCovered: false,
    securityLevel: "low",
    rating: 3.2,
    openingTime: "08:00 AM",
    closingTime: "10:00 PM",
  },
  {
    name: "Büro & Café Parking (Ñoida) — 'Premium' [Zone A]",
    location: "Straße 12, München – Süd; Near <Mall>",
    pricePerHour: 55,
    status: "available",
    distance: "3km",
    capacity: 80,
    availableSlots: 40,
    isCovered: true,
    securityLevel: "medium",
    rating: 4.0,
    openingTime: "08:00 AM",
    closingTime: "10:00 PM",
  },
  {
    name: "🚗 Smart Park 🅿️ — EV Charging ⚡ Zone",
    location: "Koramangala 4th Block 🏙️, Bangalore",
    pricePerHour: 60,
    status: "available",
    distance: "2km",
    capacity: 120,
    availableSlots: 60,
    isCovered: true,
    securityLevel: "high",
    rating: 5.0,
    openingTime: "00:00",
    closingTime: "00:00",
  },
  {
    name: "No Contact Info Parking",
    location: "Old City, Hyderabad",
    pricePerHour: 25,
    status: "available",
    distance: "6km",
    capacity: 70,
    availableSlots: 35,
    isCovered: false,
    securityLevel: "low",
    rating: 3.7,
    openingTime: "09:00 AM",
    closingTime: "08:00 PM",
    emergencyContact: null,
  },
  {
    name: "Full Contact Parking Hub",
    location: "Nariman Point, Mumbai",
    pricePerHour: 70,
    status: "available",
    distance: "1km",
    capacity: 160,
    availableSlots: 80,
    isCovered: true,
    securityLevel: "high",
    rating: 4.6,
    openingTime: "24 Hours",
    closingTime: "24 Hours",
    emergencyContact: {
      phone: "+91-9876543210",
      supportEmail: "support@fullcontactpark.in",
      managerName: "Ramesh Kumar",
    },
  },
];

async function seedDB() {
  try {
    if (!MONGO_URI) {
      throw new Error("MONGO_URI environment variable is not defined.");
    }

    await mongoose.connect(MONGO_URI);
    console.log("MongoDB Connected");

    // Clear existing data
    await User.deleteMany();
    await Parking.deleteMany();
    await Booking.deleteMany();
    await ParkingLog.deleteMany();
    console.log("Cleared existing collections.");

    // 1. Insert Parking Lots (8 static + 45 randomized = 53 total)
    const parkingData = [
      ...staticParkingLots,
      ...Array.from({ length: 45 }, () => {
        const capacity = faker.number.int({ min: 50, max: 400 });
        const status = faker.helpers.arrayElement(["available", "closed"]);
        return {
          name: faker.company.name() + " Parking",
          location: faker.location.streetAddress() + ", " + faker.location.city(),
          pricePerHour: faker.number.int({ min: 10, max: 100 }),
          status: status,
          distance: faker.number.int({ min: 1, max: 15 }) + "km",
          capacity: capacity,
          availableSlots: status === "closed" ? 0 : faker.number.int({ min: 1, max: capacity }),
          isCovered: faker.datatype.boolean(),
          securityLevel: faker.helpers.arrayElement(["low", "medium", "high"]),
          rating: parseFloat(faker.number.float({ min: 3.0, max: 5.0, fractionDigits: 1 })),
          openingTime: faker.helpers.arrayElement(["06:00 AM", "07:00 AM", "08:00 AM", "24 Hours"]),
          closingTime: faker.helpers.arrayElement(["09:00 PM", "10:00 PM", "11:00 PM", "24 Hours"]),
          emergencyContact: faker.datatype.boolean() ? {
            phone: faker.phone.number(),
            supportEmail: faker.internet.email(),
            managerName: faker.person.fullName()
          } : null
        };
      })
    ];

    const createdParking = await Parking.insertMany(parkingData);
    console.log(`Successfully created ${createdParking.length} parking lots.`);

    // 2. Insert Users
    const usersToCreate = [...staticUsers];
    
    // Assign favorites for "Power Favoriter" (all lots)
    const powerFavoriterIndex = usersToCreate.findIndex(u => u.name === "Power Favoriter");
    if (powerFavoriterIndex !== -1) {
      usersToCreate[powerFavoriterIndex].favorites = createdParking.map(p => p._id);
    }
    
    // Assign some favorites for Alice
    const aliceIndex = usersToCreate.findIndex(u => u.name === "Alice Sharma");
    if (aliceIndex !== -1) {
      usersToCreate[aliceIndex].favorites = [createdParking[0]._id, createdParking[2]._id];
    }

    const createdUsers = await User.create(usersToCreate);
    console.log(`Successfully created ${createdUsers.length} users.`);

    // Get created user references
    const alice = createdUsers.find(u => u.name === "Alice Sharma");
    const bob = createdUsers.find(u => u.name === "Bob Reset");
    const carol = createdUsers.find(u => u.name === "Carol Expired");
    const powerFavoriter = createdUsers.find(u => u.name === "Power Favoriter");
    const zeroFaves = createdUsers.find(u => u.name === "Zero Faves");
    const noNameUser = createdUsers.find(u => u.name === null);

    // Get created parking references
    const occupiedLot = createdParking.find(p => p.name === "Fully Occupied Lot");
    const maintenanceLot = createdParking.find(p => p.name === "Under Repair Garage");
    const availableLot = createdParking.find(p => p.name === "Super Ultra Premium Covered Multi-Level Automated Smart Parking Facility — Phase III Extension Wing North Block");

    // 3. Insert Bookings
    const specificBookings = [
      // Booking 1: P0-010 (Active)
      {
        userId: alice._id,
        parkingId: availableLot._id,
        bookingDate: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        duration: 3,
        totalPrice: availableLot.pricePerHour * 3,
        bookingStatus: "active"
      },
      // Booking 2: P0-011 (Completed)
      {
        userId: alice._id,
        parkingId: availableLot._id,
        bookingDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        duration: 2,
        totalPrice: availableLot.pricePerHour * 2,
        bookingStatus: "completed"
      },
      // Booking 3: P0-012 (Cancelled)
      {
        userId: alice._id,
        parkingId: availableLot._id,
        bookingDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        duration: 1,
        totalPrice: availableLot.pricePerHour * 1,
        bookingStatus: "cancelled"
      },
      // Booking 4: P1-017 (Dangling Reference)
      {
        userId: alice._id,
        parkingId: new mongoose.Types.ObjectId("000000000000000000000000"),
        bookingDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        duration: 1,
        totalPrice: 30,
        bookingStatus: "completed"
      },
      // Booking 5: P1-022 (Null optional fields mock - keeping duration & totalPrice at 0 due to schema validation)
      {
        userId: alice._id,
        parkingId: availableLot._id,
        bookingDate: null,
        duration: 0,
        totalPrice: 0,
        bookingStatus: "active"
      },
      // Booking 6: P1-026 (Free Parking Edge Case)
      {
        userId: alice._id,
        parkingId: maintenanceLot._id,
        bookingDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        duration: 1,
        totalPrice: 0,
        bookingStatus: "completed"
      },
      // Booking 7: P1-027 (Extremely high totalPrice)
      {
        userId: alice._id,
        parkingId: availableLot._id,
        bookingDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        duration: 720,
        totalPrice: 57600,
        bookingStatus: "completed"
      },
      // Booking 8: P2-030 (Leap Year)
      {
        userId: alice._id,
        parkingId: availableLot._id,
        bookingDate: new Date("2024-02-29T15:30:00.000Z"),
        duration: 2,
        totalPrice: 100,
        bookingStatus: "completed"
      },
      // Booking 9: P2-031 (Far Future)
      {
        userId: alice._id,
        parkingId: availableLot._id,
        bookingDate: new Date("2030-12-31T23:59:59.999Z"),
        duration: 1,
        totalPrice: 50,
        bookingStatus: "active"
      }
    ];

    const hourlyBookings = [];
    const availableParkingLots = createdParking.filter(p => p.status === "available" && p.pricePerHour > 0);
    
    // Generate bookings across all 24 hours (P2-023)
    for (let hour = 0; hour < 24; hour++) {
      const lot = faker.helpers.arrayElement(availableParkingLots);
      const user = faker.helpers.arrayElement([alice, bob, carol, powerFavoriter, zeroFaves, noNameUser]);
      
      const date = new Date();
      date.setDate(date.getDate() - faker.number.int({ min: 1, max: 28 }));
      date.setHours(hour, 0, 0, 0);
      
      const duration = faker.helpers.arrayElement([1, 2, 3, 4]);
      
      hourlyBookings.push({
        userId: user._id,
        parkingId: lot._id,
        bookingDate: date,
        duration: duration,
        totalPrice: lot.pricePerHour * duration,
        bookingStatus: "completed"
      });
    }

    // Generate bookings across 5 duration ranges (P2-024)
    const durationBookings = [];
    const durations = [0.5, 1.5, 2.5, 3.5, 10.0];
    
    durations.forEach(dur => {
      const lot = faker.helpers.arrayElement(availableParkingLots);
      const user = faker.helpers.arrayElement([alice, bob, carol, powerFavoriter, zeroFaves, noNameUser]);
      
      const date = new Date();
      date.setDate(date.getDate() - faker.number.int({ min: 1, max: 28 }));
      
      durationBookings.push({
        userId: user._id,
        parkingId: lot._id,
        bookingDate: date,
        duration: dur,
        totalPrice: Math.round(lot.pricePerHour * dur),
        bookingStatus: "completed"
      });
    });

    // Generate remaining bookings for yearly trends and UI stress test (P0-020)
    const randomBookings = [];
    for (let i = 0; i < 22; i++) {
      const lot = faker.helpers.arrayElement(createdParking);
      const user = faker.helpers.arrayElement([alice, bob, carol, powerFavoriter, zeroFaves, noNameUser]);
      
      const date = new Date();
      date.setMonth(date.getMonth() - faker.number.int({ min: 1, max: 11 }));
      date.setDate(faker.number.int({ min: 1, max: 28 }));
      
      const duration = faker.number.int({ min: 1, max: 8 });
      const status = faker.helpers.arrayElement(["active", "cancelled", "completed"]);
      
      randomBookings.push({
        userId: user._id,
        parkingId: lot._id,
        bookingDate: date,
        duration: duration,
        totalPrice: lot.pricePerHour * duration,
        bookingStatus: status
      });
    }

    const allBookingsToInsert = [
      ...specificBookings,
      ...hourlyBookings,
      ...durationBookings,
      ...randomBookings
    ];

    const createdBookings = await Booking.insertMany(allBookingsToInsert);
    console.log(`Successfully created ${createdBookings.length} bookings.`);

    // 4. Insert ParkingLogs
    const activeBooking = createdBookings.find(b => b.bookingStatus === "active" && b.duration === 3);
    const completedBooking = createdBookings.find(b => b.bookingStatus === "completed" && b.duration === 2);
    
    const specificLogs = [
      // P0-013: Active ParkingLog (entered, not exited)
      {
        bookingId: activeBooking._id,
        entryTime: new Date(activeBooking.bookingDate.getTime() + 5 * 60 * 1000),
        exitTime: null,
        status: "active"
      },
      // P1-014: Completed ParkingLog (full entry + exit cycle)
      {
        bookingId: completedBooking._id,
        entryTime: new Date(completedBooking.bookingDate.getTime() + 10 * 60 * 1000),
        exitTime: new Date(completedBooking.bookingDate.getTime() + 2 * 60 * 60 * 1000 + 15 * 60 * 1000),
        status: "completed"
      },
      // P2-018: ParkingLog with entryTime === null and exitTime === null
      {
        bookingId: activeBooking._id,
        entryTime: null,
        exitTime: null,
        status: "active"
      }
    ];

    // Create completed logs for all other completed bookings to enable rich dashboard hours calculation
    const otherCompletedBookings = createdBookings.filter(
      b => b.bookingStatus === "completed" && 
           b._id.toString() !== completedBooking._id.toString() &&
           b.parkingId && b.parkingId.toString() !== "000000000000000000000000"
    );

    const additionalLogs = otherCompletedBookings.map(b => {
      const duration = b.duration || 1;
      const entryOffset = faker.number.int({ min: 5, max: 15 }) * 60 * 1000;
      const entryTime = new Date(b.bookingDate.getTime() + entryOffset);
      const exitOffset = Math.round(duration * 60 * 60 * 1000) + faker.number.int({ min: -10, max: 10 }) * 60 * 1000;
      const exitTime = new Date(entryTime.getTime() + Math.max(15 * 60 * 1000, exitOffset));
      
      return {
        bookingId: b._id,
        entryTime,
        exitTime,
        status: "completed"
      };
    });

    const createdLogs = await ParkingLog.insertMany([
      ...specificLogs,
      ...additionalLogs
    ]);
    console.log(`Successfully created ${createdLogs.length} parking logs.`);

    console.log("Database seeding finished successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Database seeding failed:", err);
    process.exit(1);
  }
}

seedDB();
