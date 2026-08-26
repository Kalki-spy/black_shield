import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Chatbot } from "@/components/Chatbot";
import { services } from "@/data/services";
import { useEffect } from "react";

const ServiceDetail = () => {
  const { serviceId } = useParams();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const service = services.find((s) => s.id === serviceId);

  if (!service) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground font-mono">Service not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Breadcrumb */}
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </Link>

          {/* Header */}
          <div className="flex items-center gap-4 mb-4">
            <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center">
              <service.icon className={`h-7 w-7 ${service.color}`} />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold font-mono text-foreground">{service.title}</h1>
              <p className="text-muted-foreground mt-1">{service.description}</p>
            </div>
          </div>

          {/* Sub-services */}
          <div className="mt-12">
            <p className="text-xs font-mono text-primary mb-6 tracking-widest uppercase">// Available Services</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {service.subServices.map((sub) => (
                <Link key={sub.id} to={`/services/${service.id}/${sub.id}`} className="neon-card rounded-lg p-6 group cursor-pointer block">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <sub.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-mono font-semibold text-foreground mb-1">{sub.title}</h3>
                      <p className="text-sm text-muted-foreground">{sub.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Other service categories */}
          <div className="mt-16">
            <p className="text-xs font-mono text-primary mb-6 tracking-widest uppercase">// Other Categories</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {services
                .filter((s) => s.id !== service.id)
                .map((s) => (
                  <Link key={s.id} to={`/services/${s.id}`} className="neon-card rounded-lg p-4 text-center group">
                    <s.icon className={`h-6 w-6 mx-auto mb-2 ${s.color}`} />
                    <p className="text-xs font-mono text-muted-foreground group-hover:text-foreground transition-colors">{s.title}</p>
                  </Link>
                ))}
            </div>
          </div>
        </div>
      </div>
      <Chatbot />
    </div>
  );
};

export default ServiceDetail;