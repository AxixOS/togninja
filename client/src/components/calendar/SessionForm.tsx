import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Camera, DollarSign, User, Sun, Cloud, Star, CheckCircle, Plus, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface SessionFormData {
  title: string;
  description: string;
  sessionType: string;
  status: string;
  startTime: string;
  endTime: string;
  duration: number;
  setupTime: number;
  travelTime: number;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  guestCount: number;
  specialRequests: string;
  locationName: string;
  locationAddress: string;
  locationNotes: string;
  venueType: string;
  backupLocation: string;
  parkingNotes: string;
  goldenHourOptimized: boolean;
  weatherDependent: boolean;
  weatherBackupPlan: string;
  equipmentList: string[];
  specialEquipmentNeeded: string[];
  packageType: string;
  basePrice: number;
  depositAmount: number;
  shotList: any;
  moodBoard: string[];
  stylePreferences: string;
  mustHaveShots: string[];
  deliveryDeadline: string;
  editingNotes: string;
  deliveryMethod: string;
  portfolioWorthy: boolean;
}

interface SessionFormProps {
  onSave: (sessionData: SessionFormData) => void;
  onCancel: () => void;
  initialData?: Partial<SessionFormData>;
  isEditing?: boolean;
}

export const SessionForm: React.FC<SessionFormProps> = ({
  onSave,
  onCancel,
  initialData = {},
  isEditing = false
}) => {
  const [formData, setFormData] = useState<SessionFormData>({
    title: '',
    description: '',
    sessionType: 'portrait',
    status: 'scheduled',
    startTime: '',
    endTime: '',
    duration: 120,
    setupTime: 30,
    travelTime: 0,
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    guestCount: 1,
    specialRequests: '',
    locationName: '',
    locationAddress: '',
    locationNotes: '',
    venueType: 'outdoor',
    backupLocation: '',
    parkingNotes: '',
    goldenHourOptimized: false,
    weatherDependent: false,
    weatherBackupPlan: '',
    equipmentList: [],
    specialEquipmentNeeded: [],
    packageType: '',
    basePrice: 0,
    depositAmount: 0,
    shotList: {},
    moodBoard: [],
    stylePreferences: '',
    mustHaveShots: [],
    deliveryDeadline: '',
    editingNotes: '',
    deliveryMethod: 'gallery',
    portfolioWorthy: false,
    ...initialData
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [newEquipment, setNewEquipment] = useState('');
  const [newMoodBoardUrl, setNewMoodBoardUrl] = useState('');
  const [newMustHaveShot, setNewMustHaveShot] = useState('');

  const steps = [
    { title: 'Basic Info', icon: Calendar },
    { title: 'Client & Location', icon: MapPin },
    { title: 'Equipment & Setup', icon: Camera },
    { title: 'Creative Planning', icon: Star },
    { title: 'Business Details', icon: DollarSign },
    { title: 'Post-Production', icon: CheckCircle }
  ];

  const sessionTypes = [
    'portrait', 'wedding', 'commercial', 'event', 'family', 'fashion', 
    'maternity', 'newborn', 'corporate', 'product', 'real-estate', 'sports'
  ];

  const venueTypes = [
    'outdoor', 'indoor', 'studio', 'home', 'commercial', 'beach', 'urban', 'nature'
  ];

  const packageTypes = [
    'basic', 'standard', 'premium', 'custom', 'mini-session', 'full-day'
  ];

  const deliveryMethods = [
    'gallery', 'usb', 'cloud', 'prints', 'email', 'physical-delivery'
  ];

  const handleInputChange = (field: keyof SessionFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addEquipment = () => {
    if (newEquipment.trim()) {
      setFormData(prev => ({
        ...prev,
        equipmentList: [...prev.equipmentList, newEquipment.trim()]
      }));
      setNewEquipment('');
    }
  };

  const removeEquipment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      equipmentList: prev.equipmentList.filter((_, i) => i !== index)
    }));
  };

  const addMoodBoardUrl = () => {
    if (newMoodBoardUrl.trim()) {
      setFormData(prev => ({
        ...prev,
        moodBoard: [...prev.moodBoard, newMoodBoardUrl.trim()]
      }));
      setNewMoodBoardUrl('');
    }
  };

  const removeMoodBoardUrl = (index: number) => {
    setFormData(prev => ({
      ...prev,
      moodBoard: prev.moodBoard.filter((_, i) => i !== index)
    }));
  };

  const addMustHaveShot = () => {
    if (newMustHaveShot.trim()) {
      setFormData(prev => ({
        ...prev,
        mustHaveShots: [...prev.mustHaveShots, newMustHaveShot.trim()]
      }));
      setNewMustHaveShot('');
    }
  };

  const removeMustHaveShot = (index: number) => {
    setFormData(prev => ({
      ...prev,
      mustHaveShots: prev.mustHaveShots.filter((_, i) => i !== index)
    }));
  };

  const renderBasicInfo = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="title">Session Title</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="e.g., Sarah & John Wedding"
          />
        </div>
        <div>
          <Label htmlFor="sessionType">Session Type</Label>
          <Select
            value={formData.sessionType}
            onValueChange={(value) => handleInputChange('sessionType', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sessionTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Brief description of the session..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startTime">Start Date & Time</Label>
          <Input
            id="startTime"
            type="datetime-local"
            value={formData.startTime}
            onChange={(e) => handleInputChange('startTime', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="endTime">End Date & Time</Label>
          <Input
            id="endTime"
            type="datetime-local"
            value={formData.endTime}
            onChange={(e) => handleInputChange('endTime', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="duration">Duration (minutes)</Label>
          <Input
            id="duration"
            type="number"
            value={formData.duration}
            onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
          />
        </div>
        <div>
          <Label htmlFor="setupTime">Setup Time (minutes)</Label>
          <Input
            id="setupTime"
            type="number"
            value={formData.setupTime}
            onChange={(e) => handleInputChange('setupTime', parseInt(e.target.value))}
          />
        </div>
        <div>
          <Label htmlFor="travelTime">Travel Time (minutes)</Label>
          <Input
            id="travelTime"
            type="number"
            value={formData.travelTime}
            onChange={(e) => handleInputChange('travelTime', parseInt(e.target.value))}
          />
        </div>
      </div>
    </div>
  );

  const renderClientLocation = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="clientName">Client Name</Label>
          <Input
            id="clientName"
            value={formData.clientName}
            onChange={(e) => handleInputChange('clientName', e.target.value)}
            placeholder="Full name"
          />
        </div>
        <div>
          <Label htmlFor="clientEmail">Client Email</Label>
          <Input
            id="clientEmail"
            type="email"
            value={formData.clientEmail}
            onChange={(e) => handleInputChange('clientEmail', e.target.value)}
            placeholder="email@example.com"
          />
        </div>
        <div>
          <Label htmlFor="clientPhone">Client Phone</Label>
          <Input
            id="clientPhone"
            value={formData.clientPhone}
            onChange={(e) => handleInputChange('clientPhone', e.target.value)}
            placeholder="(555) 123-4567"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="guestCount">Number of Guests</Label>
          <Input
            id="guestCount"
            type="number"
            value={formData.guestCount}
            onChange={(e) => handleInputChange('guestCount', parseInt(e.target.value))}
            min="1"
          />
        </div>
        <div>
          <Label htmlFor="venueType">Venue Type</Label>
          <Select
            value={formData.venueType}
            onValueChange={(value) => handleInputChange('venueType', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {venueTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="locationName">Location Name</Label>
          <Input
            id="locationName"
            value={formData.locationName}
            onChange={(e) => handleInputChange('locationName', e.target.value)}
            placeholder="e.g., Central Park, Studio A"
          />
        </div>
        <div>
          <Label htmlFor="locationAddress">Location Address</Label>
          <Input
            id="locationAddress"
            value={formData.locationAddress}
            onChange={(e) => handleInputChange('locationAddress', e.target.value)}
            placeholder="Full address"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="specialRequests">Special Requests</Label>
        <Textarea
          id="specialRequests"
          value={formData.specialRequests}
          onChange={(e) => handleInputChange('specialRequests', e.target.value)}
          placeholder="Any special requests or requirements..."
          rows={3}
        />
      </div>
    </div>
  );

  const renderEquipmentSetup = () => (
    <div className="space-y-4">
      <div>
        <Label>Equipment List</Label>
        <div className="flex space-x-2 mb-2">
          <Input
            value={newEquipment}
            onChange={(e) => setNewEquipment(e.target.value)}
            placeholder="Add equipment item..."
            onKeyPress={(e) => e.key === 'Enter' && addEquipment()}
          />
          <Button type="button" onClick={addEquipment} size="sm">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.equipmentList.map((item, index) => (
            <Badge key={index} variant="secondary" className="flex items-center space-x-1">
              <span>{item}</span>
              <button
                type="button"
                onClick={() => removeEquipment(index)}
                className="ml-1 hover:text-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="goldenHour"
            checked={formData.goldenHourOptimized}
            onCheckedChange={(checked) => handleInputChange('goldenHourOptimized', checked)}
          />
          <Label htmlFor="goldenHour" className="flex items-center space-x-1">
            <Sun className="w-4 h-4 text-yellow-600" />
            <span>Golden Hour Optimized</span>
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="weatherDependent"
            checked={formData.weatherDependent}
            onCheckedChange={(checked) => handleInputChange('weatherDependent', checked)}
          />
          <Label htmlFor="weatherDependent" className="flex items-center space-x-1">
            <Cloud className="w-4 h-4 text-blue-600" />
            <span>Weather Dependent</span>
          </Label>
        </div>
      </div>

      {formData.weatherDependent && (
        <div>
          <Label htmlFor="weatherBackupPlan">Weather Backup Plan</Label>
          <Textarea
            id="weatherBackupPlan"
            value={formData.weatherBackupPlan}
            onChange={(e) => handleInputChange('weatherBackupPlan', e.target.value)}
            placeholder="Backup plan for bad weather..."
            rows={2}
          />
        </div>
      )}

      <div>
        <Label htmlFor="backupLocation">Backup Location</Label>
        <Input
          id="backupLocation"
          value={formData.backupLocation}
          onChange={(e) => handleInputChange('backupLocation', e.target.value)}
          placeholder="Alternative location if needed"
        />
      </div>

      <div>
        <Label htmlFor="parkingNotes">Parking & Access Notes</Label>
        <Textarea
          id="parkingNotes"
          value={formData.parkingNotes}
          onChange={(e) => handleInputChange('parkingNotes', e.target.value)}
          placeholder="Parking instructions, access codes, etc..."
          rows={2}
        />
      </div>
    </div>
  );

  const renderCreativePlanning = () => (
    <div className="space-y-4">
      <div>
        <Label>Mood Board URLs</Label>
        <div className="flex space-x-2 mb-2">
          <Input
            value={newMoodBoardUrl}
            onChange={(e) => setNewMoodBoardUrl(e.target.value)}
            placeholder="Add inspiration image URL..."
            onKeyPress={(e) => e.key === 'Enter' && addMoodBoardUrl()}
          />
          <Button type="button" onClick={addMoodBoardUrl} size="sm">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.moodBoard.map((url, index) => (
            <Badge key={index} variant="secondary" className="flex items-center space-x-1">
              <span className="truncate max-w-[100px]">{url}</span>
              <button
                type="button"
                onClick={() => removeMoodBoardUrl(index)}
                className="ml-1 hover:text-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="stylePreferences">Style Preferences</Label>
        <Textarea
          id="stylePreferences"
          value={formData.stylePreferences}
          onChange={(e) => handleInputChange('stylePreferences', e.target.value)}
          placeholder="Describe the desired style, mood, aesthetic..."
          rows={3}
        />
      </div>

      <div>
        <Label>Must-Have Shots</Label>
        <div className="flex space-x-2 mb-2">
          <Input
            value={newMustHaveShot}
            onChange={(e) => setNewMustHaveShot(e.target.value)}
            placeholder="Add must-have shot..."
            onKeyPress={(e) => e.key === 'Enter' && addMustHaveShot()}
          />
          <Button type="button" onClick={addMustHaveShot} size="sm">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.mustHaveShots.map((shot, index) => (
            <Badge key={index} variant="secondary" className="flex items-center space-x-1">
              <span>{shot}</span>
              <button
                type="button"
                onClick={() => removeMustHaveShot(index)}
                className="ml-1 hover:text-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="portfolioWorthy"
          checked={formData.portfolioWorthy}
          onCheckedChange={(checked) => handleInputChange('portfolioWorthy', checked)}
        />
        <Label htmlFor="portfolioWorthy" className="flex items-center space-x-1">
          <Star className="w-4 h-4 text-purple-600" />
          <span>Portfolio Worthy</span>
        </Label>
      </div>
    </div>
  );

  const renderBusinessDetails = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="packageType">Package Type</Label>
          <Select
            value={formData.packageType}
            onValueChange={(value) => handleInputChange('packageType', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select package" />
            </SelectTrigger>
            <SelectContent>
              {packageTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="basePrice">Base Price ($)</Label>
          <Input
            id="basePrice"
            type="number"
            value={formData.basePrice}
            onChange={(e) => handleInputChange('basePrice', parseFloat(e.target.value))}
            min="0"
            step="0.01"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="depositAmount">Deposit Amount ($)</Label>
        <Input
          id="depositAmount"
          type="number"
          value={formData.depositAmount}
          onChange={(e) => handleInputChange('depositAmount', parseFloat(e.target.value))}
          min="0"
          step="0.01"
        />
      </div>

      <div>
        <Label htmlFor="deliveryDeadline">Delivery Deadline</Label>
        <Input
          id="deliveryDeadline"
          type="date"
          value={formData.deliveryDeadline}
          onChange={(e) => handleInputChange('deliveryDeadline', e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="deliveryMethod">Delivery Method</Label>
        <Select
          value={formData.deliveryMethod}
          onValueChange={(value) => handleInputChange('deliveryMethod', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {deliveryMethods.map(method => (
              <SelectItem key={method} value={method}>
                {method.charAt(0).toUpperCase() + method.slice(1).replace('-', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderPostProduction = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="editingNotes">Editing Notes</Label>
        <Textarea
          id="editingNotes"
          value={formData.editingNotes}
          onChange={(e) => handleInputChange('editingNotes', e.target.value)}
          placeholder="Specific editing requirements, color grading notes, etc..."
          rows={4}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Session Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Session Type:</span>
            <Badge variant="outline">{formData.sessionType}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Date:</span>
            <span>{formData.startTime ? format(parseISO(formData.startTime + ':00'), 'MMM d, yyyy') : 'Not set'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Duration:</span>
            <span>{formData.duration} minutes</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Client:</span>
            <span>{formData.clientName || 'Not set'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Location:</span>
            <span>{formData.locationName || 'Not set'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Base Price:</span>
            <span>${formData.basePrice}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Equipment Items:</span>
            <span>{formData.equipmentList.length}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const StepIcon = steps[currentStep].icon;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {isEditing ? 'Edit' : 'Create'} Photography Session
        </h1>
        
        {/* Step Navigation */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <button
                key={index}
                type="button"
                onClick={() => setCurrentStep(index)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap ${
                  index === currentStep
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : index < currentStep
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-gray-100 text-gray-600 border border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{step.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <StepIcon className="w-5 h-5" />
              <span>{steps[currentStep].title}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentStep === 0 && renderBasicInfo()}
            {currentStep === 1 && renderClientLocation()}
            {currentStep === 2 && renderEquipmentSetup()}
            {currentStep === 3 && renderCreativePlanning()}
            {currentStep === 4 && renderBusinessDetails()}
            {currentStep === 5 && renderPostProduction()}
          </CardContent>
        </Card>

        <div className="flex justify-between mt-6">
          <div className="space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            {currentStep > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
              >
                Previous
              </Button>
            )}
          </div>
          
          <div className="space-x-2">
            {currentStep < steps.length - 1 ? (
              <Button
                type="button"
                onClick={() => setCurrentStep(currentStep + 1)}
              >
                Next
              </Button>
            ) : (
              <Button type="submit">
                {isEditing ? 'Update Session' : 'Create Session'}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default SessionForm;