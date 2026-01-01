import { useEffect, useState } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAgentProfile, useUpdateAgentProfile } from '@/hooks/useAgentDashboard';
import { toast } from 'sonner';
import { Loader2, Phone, User, MapPin } from 'lucide-react';

const AgentProfile = () => {
  const { data: profile, isLoading } = useAgentProfile();
  const updateProfile = useUpdateAgentProfile();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('');

  useEffect(() => {
    if (profile) {
      setName(profile.full_name || '');
      setPhone(profile.phone || '');
      setDistrict(profile.district || '');
    }
  }, [profile]);

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({
        full_name: name,
        phone,
        district,
      });
      toast.success('Profile saved');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save profile');
    }
  };

  return (
    <DashboardLayout title="Profile">
      <div className="max-w-2xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Agent Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Full Name
              </Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone
              </Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                District
              </Label>
              <Input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="District" />
            </div>

            <Button onClick={handleSave} disabled={updateProfile.isPending || isLoading}>
              {updateProfile.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AgentProfile;
