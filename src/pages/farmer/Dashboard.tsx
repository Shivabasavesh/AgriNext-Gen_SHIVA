import DashboardLayout from "@/layouts/DashboardLayout";
import { Loader2 } from "lucide-react";
import FarmerSummaryCard from "@/components/farmer/FarmerSummaryCard";
import QuickActions from "@/components/farmer/QuickActions";
import WeatherWidget from "@/components/farmer/WeatherWidget";
import FarmlandsSummary from "@/components/farmer/FarmlandsSummary";
import CropsSection from "@/components/farmer/CropsSection";
import HarvestTimeline from "@/components/farmer/HarvestTimeline";
import TransportSection from "@/components/farmer/TransportSection";
import MarketPricesWidget from "@/components/farmer/MarketPricesWidget";
import { useCrops } from "@/hooks/useFarmerDashboard";

const Dashboard = () => {
  // Leverage crop loading to gate initial skeleton; widgets handle their own loading states
  const { isLoading } = useCrops();

  return (
    <DashboardLayout title="Dashboard">
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading your farm data...
        </div>
      ) : (
        <div className="space-y-6">
          <FarmerSummaryCard />
          <QuickActions />

          <div className="grid gap-4 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <WeatherWidget />
            </div>
            <div className="lg:col-span-3">
              <FarmlandsSummary />
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <div className="xl:col-span-2 space-y-4">
              <CropsSection />
              <HarvestTimeline />
            </div>
            <div className="space-y-4">
              <TransportSection />
              <MarketPricesWidget />
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Dashboard;
