import React, { useState } from 'react';
import {
  Button,
  Input,
  PictureCard,
  SegmentedChoice,
  BudgetStackedBar,
  DayTimelineCard,
  ToggleSwitch,
  FeatureArchCard,
  PersonIllustration,
  CloudIllustration
} from '../../components';
import './ComponentsTest.css';

export function ComponentsTestPage() {
  // Input states
  const [textVal, setTextVal] = useState('Cairo & Luxor');
  const [budgetVal, setBudgetVal] = useState(60000);
  const [citySelect, setCitySelect] = useState('cairo');
  const [inputError, setInputError] = useState('');

  // Segmented choice states
  const [ratingScore, setRatingScore] = useState(4);
  const [timeSlot, setTimeSlot] = useState('morning');

  // PictureCard state
  const [selectedHotel, setSelectedHotel] = useState(1);

  // Budget state
  const [budgetEditMode, setBudgetEditMode] = useState(false);
  const [budgetSplit, setBudgetSplit] = useState({
    hotel: 24000,
    food: 12000,
    activities: 14000,
    transport: 10000
  });

  // Timeline activities state
  const [timelineEditMode, setTimelineEditMode] = useState(false);
  const [activities, setActivities] = useState([
    {
      id: 'act-1',
      slot: 'morning',
      category: 'activities',
      title: 'Karnak Temple Complex',
      description: 'Walk through the Great Hypostyle Hall with its 134 towering sandstone columns.',
      estimated_cost: 450
    },
    {
      id: 'act-2',
      slot: 'afternoon',
      category: 'food',
      title: 'Traditional Egyptian Lunch by the Nile',
      description: 'Koshari, fresh flatbread, grilled meats and spiced lentils.',
      estimated_cost: 650
    },
    {
      id: 'act-3',
      slot: 'evening',
      category: 'transport',
      title: 'Felucca Sunset Cruise',
      description: 'Peaceful private wooden sailboat ride along the Nile as the sun sets over the West Bank.',
      estimated_cost: 1200
    }
  ]);

  // Toggle state
  const [testToggle, setTestToggle] = useState(true);

  return (
    <div className="ayn-components-test-page">
      <header className="ayn-test-header">
        <h1 className="ayn-test-header__title">Component Library Verification</h1>
        <p className="ayn-test-header__sub">
          Interactive showcase of all reusable design system components according to DESIGN.md.
        </p>
      </header>

      {/* 1. BUTTONS */}
      <section className="ayn-test-section">
        <h2 className="ayn-test-section__title">1. Button (DESIGN.md 4.1)</h2>
        <div className="ayn-test-row">
          <Button variant="primary">Primary Action</Button>
          <Button variant="secondary">Secondary Action</Button>
          <Button variant="text">Text Button</Button>
          <Button variant="secondary" destructive>Cancel Plan (Destructive)</Button>
          <Button variant="text" destructive>Remove</Button>
          <Button variant="primary" loading>Loading</Button>
          <Button variant="primary" disabled>Disabled</Button>
        </div>
      </section>

      {/* 2. INPUTS */}
      <section className="ayn-test-section">
        <h2 className="ayn-test-section__title">2. Input (DESIGN.md 4.2)</h2>
        <div className="ayn-test-grid">
          <Input
            label="Destination"
            value={textVal}
            onChange={(e) => setTextVal(e.target.value)}
            helperText="One search box fills city & country"
          />

          <Input
            label="Total Budget (thousands formatted on blur)"
            as="number"
            value={budgetVal}
            onChange={(e) => setBudgetVal(e.target.value)}
            formatThousands
            helperText="Whole numbers in EGP"
          />

          <Input
            as="password"
            label="Password"
            defaultValue="Secret123!"
            helperText="Includes show/hide text button"
          />

          <Input
            as="select"
            label="City Select"
            value={citySelect}
            onChange={(e) => setCitySelect(e.target.value)}
            options={[
              { value: 'cairo', label: 'Cairo' },
              { value: 'luxor', label: 'Luxor' },
              { value: 'aswan', label: 'Aswan' },
              { value: 'sharm', label: 'Sharm El Sheikh' }
            ]}
          />

          <Input
            label="Input with Error"
            value={inputError}
            onChange={(e) => setInputError(e.target.value)}
            error={!inputError ? 'Trip length cannot exceed 14 days' : ''}
            placeholder="Try typing here..."
          />

          <Input
            as="textarea"
            label="Disliked last trip (Textarea min 112px)"
            placeholder="Tell us what you want to avoid..."
          />
        </div>
      </section>

      {/* 3. SEGMENTED CHOICE */}
      <section className="ayn-test-section">
        <h2 className="ayn-test-section__title">3. Segmented Choice (DESIGN.md 4.4)</h2>
        <div className="ayn-test-grid">
          <SegmentedChoice
            label="Rating Score"
            caption="1 = poor, 5 = excellent"
            options={[
              { value: 1, label: '1' },
              { value: 2, label: '2' },
              { value: 3, label: '3' },
              { value: 4, label: '4' },
              { value: 5, label: '5' }
            ]}
            value={ratingScore}
            onChange={setRatingScore}
          />

          <SegmentedChoice
            label="Time Slot"
            options={[
              { value: 'morning', label: 'Morning' },
              { value: 'afternoon', label: 'Afternoon' },
              { value: 'evening', label: 'Evening' }
            ]}
            value={timeSlot}
            onChange={setTimeSlot}
          />
        </div>
      </section>

      {/* 4. PICTURE CARD (HOTELS) */}
      <section className="ayn-test-section">
        <h2 className="ayn-test-section__title">4. Picture Card (DESIGN.md 4.6)</h2>
        <div className="ayn-test-grid">
          <PictureCard
            name="Sofitel Winter Palace"
            area="East Bank, Luxor"
            stars={5}
            details="Historic 1886 Victorian palace set in lush tropical gardens overlooking the Nile."
            totalPrice={18500}
            pricePerNight={3700}
            selected={selectedHotel === 1}
            onClick={() => setSelectedHotel(1)}
          />

          <PictureCard
            name="Steigenberger Resort Achti"
            area="Al Awameya, Luxor"
            stars={4}
            details="Relaxed riverside resort with expansive sunset terrace and tranquil garden pools."
            totalPrice={12200}
            pricePerNight={2440}
            selected={selectedHotel === 2}
            onClick={() => setSelectedHotel(2)}
          />

          <PictureCard
            name="Al Moudira Hotel (Fallback image)"
            area="West Bank, Luxor"
            stars={5}
            imageUrl="/non-existent-img.jpg"
            details="Hand-painted dome suites, antique courtyards, and quiet desert oasis atmosphere."
            totalPrice={22000}
            pricePerNight={4400}
            selected={selectedHotel === 3}
            onClick={() => setSelectedHotel(3)}
          />
        </div>
      </section>

      {/* 5. BUDGET STACKED BAR */}
      <section className="ayn-test-section">
        <div className="ayn-test-row" style={{ justifyContent: 'space-between' }}>
          <h2 className="ayn-test-section__title" style={{ border: 'none', margin: 0 }}>
            5. Budget Stacked Bar (DESIGN.md 4.8)
          </h2>
          <Button
            variant="secondary"
            onClick={() => setBudgetEditMode(!budgetEditMode)}
          >
            {budgetEditMode ? 'Exit Edit Mode' : 'Enter Edit Mode'}
          </Button>
        </div>

        <BudgetStackedBar
          totalBudget={60000}
          currency="EGP"
          budgetSplit={budgetSplit}
          planned={{ hotel: 22000, food: 10500, activities: 13000, transport: 9200 }}
          editMode={budgetEditMode}
          onSave={(newSplit) => {
            setBudgetSplit(newSplit);
            setBudgetEditMode(false);
          }}
          onCancel={() => setBudgetEditMode(false)}
        />
      </section>

      {/* 6. DAY TIMELINE CARD */}
      <section className="ayn-test-section">
        <div className="ayn-test-row" style={{ justifyContent: 'space-between' }}>
          <h2 className="ayn-test-section__title" style={{ border: 'none', margin: 0 }}>
            6. Day Timeline Card (DESIGN.md 4.9)
          </h2>
          <Button
            variant="secondary"
            onClick={() => setTimelineEditMode(!timelineEditMode)}
          >
            {timelineEditMode ? 'Exit Edit Mode' : 'Toggle Inline Edit Mode'}
          </Button>
        </div>

        <DayTimelineCard
          dayNumber={1}
          date="Tue 10 Nov 2026"
          currency="EGP"
          activities={activities}
          editMode={timelineEditMode}
          onAddActivity={(newAct) => setActivities([...activities, newAct])}
          onUpdateActivity={(id, updated) =>
            setActivities(activities.map((a) => (a.id === id ? { ...a, ...updated } : a)))
          }
          onRemoveActivity={(id) => setActivities(activities.filter((a) => a.id !== id))}
        />
      </section>

      {/* 7. TOGGLE SWITCH & FEATURE ARCH CARDS */}
      <section className="ayn-test-section">
        <h2 className="ayn-test-section__title">7. Toggle Switch & Feature Arch Cards</h2>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', marginBottom: '16px' }}>
          <ToggleSwitch
            checked={testToggle}
            onChange={setTestToggle}
            labelBefore="Not yet"
            labelAfter="Yes, take me to Ayn"
          />
          <span style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
            State: {testToggle ? 'ON' : 'OFF'}
          </span>
        </div>

        <div className="ayn-test-grid">
          <FeatureArchCard
            title="Made for you"
            description="Your survey shapes every plan"
            sceneType="pyramids"
          />
          <FeatureArchCard
            title="A budget that adds up"
            description="Hotel, food, activities and transport, split for you"
            sceneType="nile"
          />
          <FeatureArchCard
            title="Chat to change it"
            description="Ask Ayn to tweak any day"
            sceneType="redsea"
          />
          <FeatureArchCard
            title="Take it with you"
            description="Save your plan to your phone"
            sceneType="luxor"
          />
        </div>
      </section>

      {/* 8. ILLUSTRATIONS */}
      <section className="ayn-test-section">
        <h2 className="ayn-test-section__title">8. Illustration Kit (DESIGN.md 3.6)</h2>
        <div className="ayn-test-row" style={{ gap: '32px' }}>
          <div>
            <PersonIllustration variant="hat" />
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Hat variant</div>
          </div>
          <div>
            <PersonIllustration variant="backpack" />
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Backpack variant</div>
          </div>
          <div>
            <PersonIllustration variant="camera" />
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Camera variant</div>
          </div>
          <div>
            <CloudIllustration width={180} />
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Cloud shape</div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default ComponentsTestPage;
