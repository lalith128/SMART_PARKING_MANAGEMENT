
export const Hero = () => {
  return (
    <section className="pt-32 pb-16 section-padding relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5" />
      <div className="max-w-7xl mx-auto relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-fadeIn">
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-tight gradient-text">
              Your Parking, Made Simple with ParkEase
            </h1>
            <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
              Find, book, and manage parking spaces effortlessly—whether you're parking or profiting.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="primary-btn button-transition text-lg font-semibold">
                Sign Up Now
              </button>
              <button className="secondary-btn button-transition text-lg font-semibold">
                Learn More
              </button>
            </div>
          </div>
          <div className="relative animate-fadeIn">
            <div className="aspect-square rounded-2xl overflow-hidden shadow-2xl transform hover:scale-[1.02] transition-transform duration-500">
              <img
                src="https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&q=80"
                alt="Parking made easy with ParkEase"
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent" />
            </div>
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-secondary rounded-full -z-10" />
            <div className="absolute -top-6 -left-6 w-32 h-32 bg-primary/10 rounded-full -z-10" />
          </div>
        </div>
      </div>
    </section>
  );
};
