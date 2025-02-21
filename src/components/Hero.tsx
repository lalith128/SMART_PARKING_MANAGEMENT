
export const Hero = () => {
  return (
    <section className="pt-32 pb-16 section-padding">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-fadeIn">
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              Your Parking, Made Simple with ParkEase
            </h1>
            <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
              Find, book, and manage parking spaces effortlessly—whether you're parking or profiting.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="px-8 py-4 text-primary-foreground bg-primary hover:bg-primary-hover rounded-lg button-transition text-lg font-semibold">
                Sign Up Now
              </button>
              <button className="px-8 py-4 text-primary bg-secondary hover:bg-secondary-hover rounded-lg button-transition text-lg font-semibold">
                Learn More
              </button>
            </div>
          </div>
          <div className="relative animate-fadeIn">
            <div className="aspect-square rounded-2xl overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&q=80"
                alt="Parking made easy with ParkEase"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl" />
          </div>
        </div>
      </div>
    </section>
  );
};
