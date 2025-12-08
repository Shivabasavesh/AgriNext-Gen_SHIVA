import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Test user definitions
const farmers = [
  { email: "ramesh.gowda@agrimitra.in", name: "Ramesh Gowda", village: "Mandya", district: "Mandya", phone: "9876543201" },
  { email: "shankarappa@agrimitra.in", name: "Shankarappa", village: "Maddur", district: "Mandya", phone: "9876543202" },
  { email: "lakshman.shetty@agrimitra.in", name: "Lakshman Shetty", village: "Malavalli", district: "Mandya", phone: "9876543203" },
  { email: "sheela.amma@agrimitra.in", name: "Sheela Amma", village: "Pandavapura", district: "Mandya", phone: "9876543204" },
  { email: "veeresh@agrimitra.in", name: "Veeresh", village: "Ramanagara", district: "Ramanagara", phone: "9876543205" },
  { email: "ningappa@agrimitra.in", name: "Ningappa", village: "Channapatna", district: "Ramanagara", phone: "9876543206" },
  { email: "savitramma@agrimitra.in", name: "Savitramma", village: "Mysuru Rural", district: "Mysuru", phone: "9876543207" },
  { email: "harshitha@agrimitra.in", name: "Harshitha", village: "T. Narasipura", district: "Mysuru", phone: "9876543208" },
  { email: "girish@agrimitra.in", name: "Girish", village: "Srirangapatna", district: "Mandya", phone: "9876543209" },
  { email: "ravi.patil@agrimitra.in", name: "Ravi Patil", village: "K.R. Nagar", district: "Mysuru", phone: "9876543210" },
];

const agents = [
  { email: "mahesh.agent@agrimitra.in", name: "Mahesh", district: "Mandya", phone: "9876543301" },
  { email: "kavya.agent@agrimitra.in", name: "Kavya", district: "Maddur", phone: "9876543302" },
  { email: "raghav.agent@agrimitra.in", name: "Raghav", district: "Mysuru", phone: "9876543303" },
  { email: "ananya.agent@agrimitra.in", name: "Ananya", district: "Ramanagara", phone: "9876543304" },
];

const transporters = [
  { email: "raju.transport@agrimitra.in", name: "Raju Transport Service", district: "Mandya", phone: "9876543401" },
  { email: "sahana.logistics@agrimitra.in", name: "Sahana Logistics", district: "Maddur", phone: "9876543402" },
  { email: "manjunath.truck@agrimitra.in", name: "Manjunath Mini-Truck", district: "Ramanagara", phone: "9876543403" },
  { email: "swaroop.goods@agrimitra.in", name: "Swaroop Goods Carrier", district: "Malavalli", phone: "9876543404" },
  { email: "sriram.transport@agrimitra.in", name: "Sri Ram Transport", district: "Mysuru", phone: "9876543405" },
];

const buyers = [
  { email: "freshmart@agrimitra.in", name: "FreshMart Mandya", company: "FreshMart Mandya", type: "retail", district: "Mandya", phone: "9876543501", crops: ["Tomato", "Onion", "Chilli"] },
  { email: "mysuru.wholesale@agrimitra.in", name: "Mysuru Veg Wholesale", company: "Mysuru Veg Wholesale", type: "wholesale", district: "Mysuru", phone: "9876543502", crops: ["Rice", "Ragi", "Maize"] },
  { email: "nalpak@agrimitra.in", name: "Hotel Nalpak", company: "Hotel Nalpak", type: "restaurant", district: "Mandya", phone: "9876543503", crops: ["Tomato", "Beans", "Potato"] },
  { email: "greenleaf@agrimitra.in", name: "GreenLeaf Juices", company: "GreenLeaf Juices", type: "retail", district: "Mysuru", phone: "9876543504", crops: ["Banana", "Coconut"] },
  { email: "krexports@agrimitra.in", name: "KR Export Traders", company: "KR Export Traders", type: "export", district: "Mandya", phone: "9876543505", crops: ["Rice", "Ragi", "Banana"] },
];

const admins = [
  { email: "admin@agrimitra.in", name: "Super Admin", role: "super_admin", district: null, phone: "9876543601" },
  { email: "ops@agrimitra.in", name: "Operations Admin", role: "operations_admin", district: "Mandya", phone: "9876543602" },
];

const cropTypes = [
  { name: "Tomato", variety: "Hybrid", unit: "quintals" },
  { name: "Onion", variety: "Bellary Red", unit: "quintals" },
  { name: "Ragi", variety: "GPU-28", unit: "quintals" },
  { name: "Rice", variety: "Sona Masuri", unit: "quintals" },
  { name: "Maize", variety: "Yellow", unit: "quintals" },
  { name: "Banana", variety: "Robusta", unit: "bunches" },
  { name: "Coconut", variety: "Tall", unit: "nuts" },
  { name: "Chilli", variety: "Byadgi", unit: "quintals" },
  { name: "Beans", variety: "French Beans", unit: "quintals" },
  { name: "Potato", variety: "Kufri Jyoti", unit: "quintals" },
];

const vehicleTypes = [
  { type: "Bolero Pickup", capacity: 2000 },
  { type: "Tata Ace", capacity: 750 },
  { type: "Mini-Truck", capacity: 1500 },
  { type: "Ashok Leyland Dost", capacity: 1250 },
  { type: "Mahindra Supro", capacity: 1000 },
];

const taskTypes = ["visit", "verify_crop", "harvest_check", "transport_assist"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const results: Record<string, unknown> = {};
    const userIds: Record<string, string> = {};
    const farmerIds: string[] = [];
    const agentIds: string[] = [];
    const transporterRecordIds: string[] = [];
    const buyerRecordIds: string[] = [];
    const farmlandIds: string[] = [];
    const cropIds: string[] = [];

    // Helper to create user
    async function createUser(email: string, password: string, metadata: Record<string, unknown>) {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: metadata,
      });
      if (error && !error.message.includes("already been registered")) {
        console.error(`Error creating user ${email}:`, error);
        return null;
      }
      if (data?.user) return data.user.id;
      
      // User exists, fetch their ID
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existing = existingUsers?.users?.find(u => u.email === email);
      return existing?.id || null;
    }

    // 1. Create Farmer accounts
    console.log("Creating farmers...");
    for (const farmer of farmers) {
      const userId = await createUser(farmer.email, "farmer123", { full_name: farmer.name, role: "farmer", phone: farmer.phone });
      if (userId) {
        userIds[farmer.email] = userId;
        farmerIds.push(userId);
        
        // Upsert profile
        await supabase.from("profiles").upsert({
          id: userId,
          full_name: farmer.name,
          phone: farmer.phone,
          village: farmer.village,
          district: farmer.district,
          total_land_area: Math.floor(Math.random() * 10) + 2,
        }, { onConflict: "id" });

        // Upsert role
        await supabase.from("user_roles").upsert({
          user_id: userId,
          role: "farmer",
        }, { onConflict: "user_id,role" });
      }
    }
    results.farmers = farmerIds.length;

    // 2. Create Agent accounts
    console.log("Creating agents...");
    for (const agent of agents) {
      const userId = await createUser(agent.email, "agent123", { full_name: agent.name, role: "agent", phone: agent.phone });
      if (userId) {
        userIds[agent.email] = userId;
        agentIds.push(userId);

        await supabase.from("profiles").upsert({
          id: userId,
          full_name: agent.name,
          phone: agent.phone,
          district: agent.district,
        }, { onConflict: "id" });

        await supabase.from("user_roles").upsert({
          user_id: userId,
          role: "agent",
        }, { onConflict: "user_id,role" });
      }
    }
    results.agents = agentIds.length;

    // 3. Create Transporter accounts
    console.log("Creating transporters...");
    for (let i = 0; i < transporters.length; i++) {
      const trans = transporters[i];
      const userId = await createUser(trans.email, "trans123", { full_name: trans.name, role: "logistics", phone: trans.phone });
      if (userId) {
        userIds[trans.email] = userId;

        await supabase.from("profiles").upsert({
          id: userId,
          full_name: trans.name,
          phone: trans.phone,
          district: trans.district,
        }, { onConflict: "id" });

        await supabase.from("user_roles").upsert({
          user_id: userId,
          role: "logistics",
        }, { onConflict: "user_id,role" });

        // Create transporter record
        const { data: transRecord } = await supabase.from("transporters").upsert({
          user_id: userId,
          name: trans.name,
          phone: trans.phone,
          operating_district: trans.district,
          vehicle_type: vehicleTypes[i % vehicleTypes.length].type,
          vehicle_capacity: vehicleTypes[i % vehicleTypes.length].capacity,
        }, { onConflict: "user_id" }).select().single();

        if (transRecord) {
          transporterRecordIds.push(transRecord.id);

          // Create vehicle for this transporter
          const vehicle = vehicleTypes[i % vehicleTypes.length];
          await supabase.from("vehicles").insert({
            transporter_id: transRecord.id,
            vehicle_type: vehicle.type,
            capacity: vehicle.capacity,
            number_plate: `KA${10 + i}-${String.fromCharCode(65 + i)}${1000 + i * 111}`,
            is_active: true,
          });
        }
      }
    }
    results.transporters = transporterRecordIds.length;

    // 4. Create Buyer accounts
    console.log("Creating buyers...");
    for (const buyer of buyers) {
      const userId = await createUser(buyer.email, "buyer123", { full_name: buyer.name, role: "buyer", phone: buyer.phone });
      if (userId) {
        userIds[buyer.email] = userId;

        await supabase.from("profiles").upsert({
          id: userId,
          full_name: buyer.name,
          phone: buyer.phone,
          district: buyer.district,
        }, { onConflict: "id" });

        await supabase.from("user_roles").upsert({
          user_id: userId,
          role: "buyer",
        }, { onConflict: "user_id,role" });

        // Create buyer record
        const { data: buyerRecord } = await supabase.from("buyers").upsert({
          user_id: userId,
          name: buyer.name,
          company_name: buyer.company,
          buyer_type: buyer.type,
          district: buyer.district,
          phone: buyer.phone,
          preferred_crops: buyer.crops,
        }, { onConflict: "user_id" }).select().single();

        if (buyerRecord) buyerRecordIds.push(buyerRecord.id);
      }
    }
    results.buyers = buyerRecordIds.length;

    // 5. Create Admin accounts
    console.log("Creating admins...");
    for (const admin of admins) {
      const userId = await createUser(admin.email, admin.role === "super_admin" ? "admin123" : "ops123", { full_name: admin.name, role: "admin", phone: admin.phone });
      if (userId) {
        userIds[admin.email] = userId;

        await supabase.from("profiles").upsert({
          id: userId,
          full_name: admin.name,
          phone: admin.phone,
          district: admin.district,
        }, { onConflict: "id" });

        await supabase.from("user_roles").upsert({
          user_id: userId,
          role: "admin",
        }, { onConflict: "user_id,role" });

        // Create admin user record
        await supabase.from("admin_users").upsert({
          user_id: userId,
          name: admin.name,
          email: admin.email,
          phone: admin.phone,
          role: admin.role,
          assigned_district: admin.district,
        }, { onConflict: "user_id" });
      }
    }
    results.admins = 2;

    // 6. Create Farmlands for each farmer
    console.log("Creating farmlands...");
    const soilTypes = ["Red Soil", "Black Soil", "Alluvial", "Laterite", "Clay"];
    for (let i = 0; i < farmerIds.length; i++) {
      const farmerId = farmerIds[i];
      const farmer = farmers[i];
      const numLands = Math.random() > 0.5 ? 2 : 1;

      for (let j = 0; j < numLands; j++) {
        const { data: land } = await supabase.from("farmlands").insert({
          farmer_id: farmerId,
          name: `${farmer.name}'s Farm ${j + 1}`,
          area: Math.floor(Math.random() * 5) + 1,
          area_unit: "acres",
          village: farmer.village,
          district: farmer.district,
          soil_type: soilTypes[Math.floor(Math.random() * soilTypes.length)],
          location_lat: 12.3 + Math.random() * 0.5,
          location_long: 76.5 + Math.random() * 0.5,
        }).select().single();

        if (land) farmlandIds.push(land.id);
      }
    }
    results.farmlands = farmlandIds.length;

    // 7. Create Crops
    console.log("Creating crops...");
    const statuses: Array<"growing" | "one_week" | "ready" | "harvested"> = ["growing", "one_week", "ready", "harvested"];
    const today = new Date();

    for (let i = 0; i < farmlandIds.length; i++) {
      const farmerId = farmerIds[i % farmerIds.length];
      const landId = farmlandIds[i];
      const numCrops = Math.random() > 0.6 ? 2 : 1;

      for (let j = 0; j < numCrops; j++) {
        const cropType = cropTypes[(i + j) % cropTypes.length];
        let status: "growing" | "one_week" | "ready" | "harvested";
        let harvestDays: number;

        // Ensure distribution: 5 one_week, 5 ready, rest growing
        if (cropIds.length < 5) {
          status = "one_week";
          harvestDays = Math.floor(Math.random() * 7) + 1;
        } else if (cropIds.length < 10) {
          status = "ready";
          harvestDays = 0;
        } else {
          status = statuses[Math.floor(Math.random() * 3)];
          harvestDays = status === "growing" ? Math.floor(Math.random() * 60) + 14 : 
                        status === "one_week" ? Math.floor(Math.random() * 7) + 1 : 0;
        }

        const sowingDate = new Date(today);
        sowingDate.setDate(sowingDate.getDate() - (90 - harvestDays));
        const harvestDate = new Date(today);
        harvestDate.setDate(harvestDate.getDate() + harvestDays);

        const { data: crop } = await supabase.from("crops").insert({
          farmer_id: farmerId,
          land_id: landId,
          crop_name: cropType.name,
          variety: cropType.variety,
          sowing_date: sowingDate.toISOString().split("T")[0],
          harvest_estimate: harvestDate.toISOString().split("T")[0],
          status: status,
          estimated_quantity: Math.floor(Math.random() * 50) + 10,
          quantity_unit: cropType.unit,
        }).select().single();

        if (crop) cropIds.push(crop.id);
      }
    }
    results.crops = cropIds.length;

    // 8. Create Agent Tasks
    console.log("Creating agent tasks...");
    const taskStatuses: Array<"pending" | "in_progress" | "completed"> = ["pending", "in_progress", "completed"];
    let tasksCreated = 0;

    for (let i = 0; i < 12; i++) {
      const agentId = agentIds[i % agentIds.length];
      const farmerId = farmerIds[i % farmerIds.length];
      const cropId = cropIds[i % cropIds.length];

      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 14) - 3);

      await supabase.from("agent_tasks").insert({
        agent_id: agentId,
        farmer_id: farmerId,
        crop_id: cropId,
        task_type: taskTypes[i % taskTypes.length] as "visit" | "verify_crop" | "harvest_check" | "transport_assist",
        task_status: taskStatuses[i % taskStatuses.length],
        due_date: dueDate.toISOString().split("T")[0],
        priority: Math.floor(Math.random() * 3) + 1,
        notes: `Task for ${farmers[i % farmers.length].name} - ${taskTypes[i % taskTypes.length]}`,
      });
      tasksCreated++;
    }
    results.agent_tasks = tasksCreated;

    // 9. Create Agent Data entries
    console.log("Creating agent data...");
    for (let i = 0; i < agentIds.length; i++) {
      const agentId = agentIds[i];
      // Assign 2-3 farmers to each agent
      for (let j = 0; j < 3; j++) {
        const farmerIndex = (i * 3 + j) % farmerIds.length;
        await supabase.from("agent_data").insert({
          agent_id: agentId,
          farmer_id: farmerIds[farmerIndex],
          farm_location: farmers[farmerIndex].village,
          soil_type: soilTypes[j % soilTypes.length],
          soil_moisture: ["Low", "Medium", "High"][j % 3],
          soil_ph: 6 + Math.random() * 2,
          crop_type: cropTypes[j % cropTypes.length].name,
          crop_health: ["Good", "Moderate", "Excellent"][j % 3],
          notes: `Field data collected for ${farmers[farmerIndex].name}`,
        });
      }
    }
    results.agent_data = agentIds.length * 3;

    // 10. Create Transport Requests
    console.log("Creating transport requests...");
    const transportStatuses: Array<"requested" | "assigned" | "en_route" | "picked_up" | "delivered"> = 
      ["requested", "requested", "requested", "assigned", "assigned", "assigned", "en_route", "en_route", "delivered"];
    
    for (let i = 0; i < 9; i++) {
      const farmerId = farmerIds[i % farmerIds.length];
      const cropId = cropIds[i % cropIds.length];
      const status = transportStatuses[i];
      
      const preferredDate = new Date(today);
      preferredDate.setDate(preferredDate.getDate() + Math.floor(Math.random() * 7) + 1);

      const requestData: Record<string, unknown> = {
        farmer_id: farmerId,
        crop_id: cropId,
        quantity: Math.floor(Math.random() * 30) + 5,
        quantity_unit: "quintals",
        pickup_location: farmers[i % farmers.length].village,
        pickup_village: farmers[i % farmers.length].village,
        preferred_date: preferredDate.toISOString().split("T")[0],
        preferred_time: ["Morning", "Afternoon", "Evening"][i % 3],
        status: status,
        notes: `Transport request for ${cropTypes[i % cropTypes.length].name}`,
      };

      // Assign transporter for non-requested statuses
      if (status !== "requested" && transporterRecordIds.length > 0) {
        const { data: transporter } = await supabase
          .from("transporters")
          .select("id, user_id")
          .eq("id", transporterRecordIds[i % transporterRecordIds.length])
          .single();
        
        if (transporter) {
          requestData.transporter_id = transporter.user_id;
        }
      }

      if (status === "delivered") {
        requestData.completed_at = new Date().toISOString();
        requestData.distance_km = Math.floor(Math.random() * 50) + 10;
      }

      await supabase.from("transport_requests").insert(requestData);
    }
    results.transport_requests = 9;

    // 11. Create Market Orders
    console.log("Creating market orders...");
    const orderStatuses = ["requested", "requested", "confirmed", "confirmed", "in_transport", "delivered"];
    
    for (let i = 0; i < 6; i++) {
      const buyerId = buyerRecordIds[i % buyerRecordIds.length];
      const farmerId = farmerIds[i % farmerIds.length];
      const cropId = cropIds[i % cropIds.length];

      const deliveryDate = new Date(today);
      deliveryDate.setDate(deliveryDate.getDate() + Math.floor(Math.random() * 14) + 3);

      await supabase.from("market_orders").insert({
        buyer_id: buyerId,
        farmer_id: farmerId,
        crop_id: cropId,
        quantity: Math.floor(Math.random() * 20) + 5,
        quantity_unit: "quintals",
        price_offered: Math.floor(Math.random() * 5000) + 2000,
        status: orderStatuses[i],
        payment_status: orderStatuses[i] === "delivered" ? "completed" : "pending",
        delivery_date: deliveryDate.toISOString().split("T")[0],
        delivery_address: `${buyers[i % buyers.length].company}, ${buyers[i % buyers.length].district}`,
        notes: `Order for ${cropTypes[i % cropTypes.length].name}`,
      });
    }
    results.market_orders = 6;

    // 12. Create Market Prices
    console.log("Creating market prices...");
    const markets = ["Mandya APMC", "Mysuru APMC", "Ramanagara Market", "Channapatna Mandi"];
    const trends: Array<"up" | "down" | "flat"> = ["up", "down", "flat"];

    for (const crop of cropTypes) {
      for (const market of markets) {
        const basePrice = Math.floor(Math.random() * 3000) + 1000;
        await supabase.from("market_prices").insert({
          crop_name: crop.name,
          market_name: market,
          modal_price: basePrice,
          min_price: basePrice - Math.floor(Math.random() * 200),
          max_price: basePrice + Math.floor(Math.random() * 300),
          trend_direction: trends[Math.floor(Math.random() * trends.length)],
          date: today.toISOString().split("T")[0],
        });
      }
    }
    results.market_prices = cropTypes.length * markets.length;

    // 13. Create AI Logs
    console.log("Creating AI logs...");
    
    // Agent AI logs
    for (const agentId of agentIds) {
      await supabase.from("ai_agent_logs").insert([
        {
          agent_id: agentId,
          log_type: "visit_prioritization",
          input_context: { farmers: 5, pending_tasks: 3 },
          output_text: "Recommended visit order: 1. Ramesh Gowda (harvest ready), 2. Shankarappa (crop verification needed), 3. Lakshman Shetty (routine check)",
        },
        {
          agent_id: agentId,
          log_type: "cluster_summary",
          input_context: { region: "Mandya", crops: 15 },
          output_text: "Cluster Health: Good. 5 crops ready for harvest. 3 farmers need immediate attention for pest management. Recommend prioritizing transport for tomato crops.",
        },
      ]);
    }
    results.ai_agent_logs = agentIds.length * 2;

    // Transport AI logs
    for (const transId of transporterRecordIds) {
      await supabase.from("ai_transport_logs").insert({
        transporter_id: transId,
        log_type: "route_optimization",
        input_data: { pickups: 4, locations: ["Mandya", "Maddur", "Malavalli"] },
        output_text: "Optimized route: Mandya → Maddur → Malavalli. Total distance: 45km. Estimated time: 2.5 hours. Fuel savings: 15%.",
      });
    }
    results.ai_transport_logs = transporterRecordIds.length;

    // Market AI logs
    for (const buyerId of buyerRecordIds) {
      await supabase.from("ai_market_logs").insert({
        buyer_id: buyerId,
        module_type: "price_forecast",
        input_data: { crop: "Tomato", region: "Mandya" },
        output_text: "Tomato prices expected to rise 12% in next 7 days due to reduced supply. Recommend purchasing now. Risk level: Low.",
      });
    }
    results.ai_market_logs = buyerRecordIds.length;

    // Admin AI logs
    const adminUserIds = [userIds["admin@agrimitra.in"], userIds["ops@agrimitra.in"]].filter(Boolean);
    for (const adminUserId of adminUserIds) {
      const { data: adminRecord } = await supabase.from("admin_users").select("id").eq("user_id", adminUserId).single();
      if (adminRecord) {
        await supabase.from("ai_admin_logs").insert([
          {
            admin_id: adminRecord.id,
            module_type: "cluster_intelligence",
            input_data: { districts: ["Mandya", "Mysuru"], timeframe: "7_days" },
            output_text: "Cluster Health: Mandya - Good (85%), Mysuru - Moderate (72%). Key risks: Delayed harvests in Ramanagara. Recommendations: Deploy additional agents to Mysuru cluster.",
          },
          {
            admin_id: adminRecord.id,
            module_type: "supply_demand_forecast",
            input_data: { crops: ["Tomato", "Onion", "Rice"] },
            output_text: "7-Day Forecast: Tomato surplus expected (120%). Onion shortage likely (65% of demand). Rice balanced. Action: Prioritize onion procurement, defer tomato orders.",
          },
        ]);
      }
    }
    results.ai_admin_logs = adminUserIds.length * 2;

    // 14. Create Notifications for farmers
    console.log("Creating notifications...");
    for (const farmerId of farmerIds.slice(0, 5)) {
      await supabase.from("notifications").insert([
        {
          user_id: farmerId,
          title: "Crop Ready for Harvest",
          message: "Your tomato crop is ready for harvest. Consider requesting transport.",
          type: "harvest",
          is_read: false,
        },
        {
          user_id: farmerId,
          title: "Agent Visit Scheduled",
          message: "Field agent will visit your farm tomorrow for crop verification.",
          type: "visit",
          is_read: true,
        },
      ]);
    }
    results.notifications = 10;

    return new Response(JSON.stringify({
      success: true,
      message: "Test data seeded successfully!",
      summary: results,
      credentials: {
        farmers: "All farmers: [email]@agrimitra.in / farmer123",
        agents: "All agents: [name].agent@agrimitra.in / agent123",
        transporters: "All transporters: [name].transport@agrimitra.in / trans123",
        buyers: "All buyers: [email]@agrimitra.in / buyer123",
        admins: {
          super: "admin@agrimitra.in / admin123",
          ops: "ops@agrimitra.in / ops123"
        }
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Seeder error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    return new Response(JSON.stringify({ 
      error: errorMessage,
      stack: errorStack 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
