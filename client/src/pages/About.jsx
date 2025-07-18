import React from 'react';
import { Award, Users, Globe, Heart, Truck, Shield } from 'lucide-react';

const About = () => {
  const stats = [
    { number: '50K+', label: 'Happy Customers' },
    { number: '1000+', label: 'Products' },
    { number: '15+', label: 'Years Experience' },
    { number: '50+', label: 'Brands' }
  ];

  const values = [
    {
      icon: <Award className="h-8 w-8 text-blue-900" />,
      title: 'Quality First',
      description: 'We source only the finest materials and work with trusted manufacturers to ensure every shoe meets our high standards.'
    },
    {
      icon: <Users className="h-8 w-8 text-blue-900" />,
      title: 'Customer Focused',
      description: 'Our customers are at the heart of everything we do. We listen, adapt, and continuously improve to serve you better.'
    },
    {
      icon: <Globe className="h-8 w-8 text-blue-900" />,
      title: 'Global Reach',
      description: 'From local communities to international markets, we bring quality footwear to customers worldwide.'
    },
    {
      icon: <Heart className="h-8 w-8 text-blue-900" />,
      title: 'Passion Driven',
      description: 'Our love for footwear and fashion drives us to curate collections that inspire and empower our customers.'
    }
  ];

  const team = [
    {
      name: 'Sarah Johnson',
      role: 'Founder & CEO',
      image: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=300',
      description: 'With over 20 years in the fashion industry, Sarah founded SoleStyle with a vision to make quality footwear accessible to everyone.'
    },
    {
      name: 'Michael Chen',
      role: 'Head of Design',
      image: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=300',
      description: 'Michael brings creativity and innovation to our product line, ensuring every design balances style with comfort.'
    },
    {
      name: 'Emily Rodriguez',
      role: 'Customer Experience Director',
      image: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=300',
      description: 'Emily leads our customer service team, ensuring every interaction exceeds expectations and builds lasting relationships.'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-900 to-blue-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">About SoleStyle</h1>
          <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto">
            Crafting exceptional footwear experiences since 2009. We believe every step should be comfortable, stylish, and confident.
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-blue-900 mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Story</h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  SoleStyle began as a small family business with a simple mission: to provide high-quality, 
                  comfortable, and stylish footwear for everyone. What started in a small storefront has grown 
                  into a trusted brand serving customers worldwide.
                </p>
                <p>
                  Our journey has been driven by a passion for craftsmanship and an unwavering commitment to 
                  customer satisfaction. We believe that the right pair of shoes can transform not just your 
                  outfit, but your entire day.
                </p>
                <p>
                  Today, we continue to honor our founding principles while embracing innovation and sustainability. 
                  Every shoe in our collection is carefully selected to meet our standards of quality, comfort, 
                  and style.
                </p>
              </div>
            </div>
            <div className="relative">
              <img
                src="https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=600"
                alt="Our Story"
                className="rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Values</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              These core values guide everything we do and shape the way we serve our customers.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div key={index} className="text-center">
                <div className="flex justify-center mb-4">
                  {value.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {value.title}
                </h3>
                <p className="text-gray-600">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Meet Our Team</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              The passionate individuals behind SoleStyle who work tirelessly to bring you the best footwear experience.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {team.map((member, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-full h-64 object-cover"
                />
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">
                    {member.name}
                  </h3>
                  <p className="text-blue-900 font-medium mb-3">{member.role}</p>
                  <p className="text-gray-600">{member.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 bg-blue-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
          <p className="text-xl text-blue-100 max-w-4xl mx-auto mb-8">
            To empower individuals through exceptional footwear that combines comfort, style, and quality. 
            We strive to make every step of your journey more confident and comfortable.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            <div className="text-center">
              <Truck className="h-12 w-12 text-orange-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Fast Delivery</h3>
              <p className="text-blue-100">Quick and reliable shipping to get your shoes to you faster.</p>
            </div>
            <div className="text-center">
              <Shield className="h-12 w-12 text-orange-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Quality Guarantee</h3>
              <p className="text-blue-100">Every product is backed by our commitment to excellence.</p>
            </div>
            <div className="text-center">
              <Heart className="h-12 w-12 text-orange-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Customer Love</h3>
              <p className="text-blue-100">Your satisfaction is our top priority and greatest reward.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;