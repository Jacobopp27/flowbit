import { useState } from 'react';
import * as React from 'react';
import { ArrowRight, Package, BarChart3, Users, ChevronDown, Menu, X, Zap, Layers, DollarSign, Calendar, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import flowbitLogo from '@/assets/flowbit-logo.png';
import flowbitLogoBlanco from '@/assets/flowbit-logoblanco.png';

export function Landing() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [countryCode, setCountryCode] = useState('+57'); // Default Colombia

  // Enable smooth scrolling
  React.useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = '';
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 relative scroll-smooth">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-30"></div>
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white z-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <img src={flowbitLogo} alt="Flowbit" className="h-20" />
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition">Características</a>
              <a href="#how-it-works" className="text-gray-600 hover:text-gray-900 transition">Cómo funciona</a>
              <a href="#faq" className="text-gray-600 hover:text-gray-900 transition">FAQ</a>
              <Link to="/login" className="text-gray-600 hover:text-gray-900 transition">Iniciar sesión</Link>
              <Button className="bg-blue-600 hover:bg-blue-700" asChild>
                <a href="#demo">Agendar demo</a>
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 space-y-3 border-t border-gray-100">
              <a href="#features" className="block text-gray-600 hover:text-gray-900">Características</a>
              <a href="#how-it-works" className="block text-gray-600 hover:text-gray-900">Cómo funciona</a>
              <a href="#faq" className="block text-gray-600 hover:text-gray-900">FAQ</a>
              <Link to="/login" className="block text-gray-600 hover:text-gray-900">Iniciar sesión</Link>
              <Button className="w-full" asChild>
                <a href="#demo">Agendar demo</a>
              </Button>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-4 overflow-hidden">
        {/* Blue decorative elements */}
        <div className="absolute top-20 -right-20 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 -left-20 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-15"></div>
        <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-12">
            
            <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 leading-tight mb-6">
              Controla tu producción <br />
              <span className="text-blue-600">sin perder la cabeza</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
              Gestiona proyectos, etapas, materiales, costos y plazos desde una plataforma diseñada para PYMES.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-lg px-8 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/30" asChild>
                <a href="#demo">
                  Agendar demo gratuita
                  <ArrowRight className="ml-2 h-5 w-5" />
                </a>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 border-gray-300 hover:bg-white" asChild>
                <a href="#how-it-works">Ver cómo funciona</a>
              </Button>
            </div>
          </div>

          {/* Dashboard Preview - Browser Frame */}
          <div className="max-w-5xl mx-auto mt-16">
            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
              {/* Browser Bar */}
              <div className="bg-gray-100 px-4 py-3 flex items-center gap-2 border-b border-gray-200">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div className="flex-1 bg-white rounded px-3 py-1 text-xs text-gray-500 ml-4">
                  www.flowbiit.com/dashboard
                </div>
              </div>
              
              {/* Dashboard Content */}
              <div className="p-8 bg-gradient-to-br from-slate-50 to-white">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Dashboard General</h3>
                  <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">Actualizado ahora</span>
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-gray-900">$45,230</div>
                      <div className="text-sm text-gray-600">Ingresos totales</div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-green-500">
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-gray-900">8</div>
                      <div className="text-sm text-gray-600">Proyectos activos</div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-purple-500">
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-gray-900">92%</div>
                      <div className="text-sm text-gray-600">En tiempo</div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-orange-500">
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-gray-900">$12,450</div>
                      <div className="text-sm text-gray-600">Ganancia neta</div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid lg:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <h4 className="font-medium text-gray-900 mb-3">Proyectos recientes</h4>
                      <div>
                        <div className="flex justify-between text-xs mb-2">
                          <span className="text-gray-600">Camisetas Logo Empresa</span>
                          <span className="text-gray-900 font-medium">75%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full" style={{width: '75%'}}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-2">
                          <span className="text-gray-600">Uniformes Corporativos</span>
                          <span className="text-gray-900 font-medium">45%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-600 rounded-full" style={{width: '45%'}}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-2">
                          <span className="text-gray-600">Mochilas Escolares</span>
                          <span className="text-gray-900 font-medium">90%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-600 rounded-full" style={{width: '90%'}}></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium text-gray-900 mb-3">Actividad reciente</h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5"></div>
                          <div>
                            <p className="text-gray-900">Etapa de corte completada</p>
                            <p className="text-gray-500 text-xs">Proyecto: Camisetas Logo - Hace 2h</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5"></div>
                          <div>
                            <p className="text-gray-900">Nuevo material agregado</p>
                            <p className="text-gray-500 text-xs">Tela Jersey 100% - Hace 4h</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5"></div>
                          <div>
                            <p className="text-gray-900">Evento financiero registrado</p>
                            <p className="text-gray-500 text-xs">Pago a proveedor - Hace 1d</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem → Solution */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              ¿Te suena familiar?
            </h2>
            <p className="text-xl text-gray-600">
              Los problemas que Flowbiit resuelve todos los días
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg border-l-4 border-red-500">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Información perdida</h3>
              <p className="text-gray-600">Mensajes en WhatsApp, notas en papel, archivos de Excel desactualizados...</p>
            </div>

            <div className="bg-white p-8 rounded-lg border-l-4 border-red-500">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Retrasos constantes</h3>
              <p className="text-gray-600">"¿Ya terminaste?" "¿Ya puedo empezar?" La falta de visibilidad paraliza tu equipo.</p>
            </div>

            <div className="bg-white p-8 rounded-lg border-l-4 border-red-500">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Clientes insatisfechos</h3>
              <p className="text-gray-600">Entregas tardías y promesas incumplidas deterioran tu reputación.</p>
            </div>
          </div>

          {/* Metrics Section */}
          <div className="mt-16">
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold text-gray-900 mb-4">Resultados medibles desde el primer día</h3>
              <p className="text-xl text-gray-600">Empresas que usan Flowbiit reportan mejoras significativas</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {/* Metric 1 - Time Saved */}
              <Card className="p-8 border-none shadow-lg bg-gradient-to-br from-blue-50 to-white">
                <div className="text-center">
                  <div className="mb-4">
                    <BarChart3 className="h-12 w-12 text-blue-600 mx-auto" />
                  </div>
                  <div className="relative h-48 mb-6 flex items-end justify-center gap-8">
                    {/* Bar chart representation */}
                    <div className="relative">
                      <div className="w-20 bg-gray-300 rounded-t-lg" style={{height: '80px'}}>
                      </div>
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-sm font-semibold text-gray-600 whitespace-nowrap">Antes</div>
                    </div>
                    <div className="relative">
                      <div className="w-20 bg-blue-600 rounded-t-lg" style={{height: '170px'}}>
                      </div>
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-sm font-semibold text-blue-600 whitespace-nowrap">Con Flowbiit</div>
                    </div>
                  </div>
                  <h4 className="text-3xl font-bold text-blue-600 mb-2">+40 horas</h4>
                  <p className="text-gray-600">ahorradas al mes en coordinación</p>
                </div>
              </Card>

              {/* Metric 2 - On-time delivery */}
              <Card className="p-8 border-none shadow-lg bg-gradient-to-br from-green-50 to-white">
                <div className="text-center">
                  <div className="mb-4">
                    <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
                  </div>
                  <div className="relative h-48 mb-6 flex items-center justify-center">
                    {/* Circular progress */}
                    <div className="relative w-40 h-40">
                      <svg className="transform -rotate-90 w-40 h-40">
                        <circle cx="80" cy="80" r="70" stroke="#e5e7eb" strokeWidth="12" fill="none" />
                        <circle cx="80" cy="80" r="70" stroke="#16a34a" strokeWidth="12" fill="none"
                          strokeDasharray="440" strokeDashoffset="66" strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-4xl font-bold text-green-600">85%</span>
                      </div>
                    </div>
                  </div>
                  <h4 className="text-3xl font-bold text-green-600 mb-2">85%</h4>
                  <p className="text-gray-600">de proyectos entregados a tiempo</p>
                </div>
              </Card>

              {/* Metric 3 - Visibility and Control */}
              <Card className="p-8 border-none shadow-lg bg-gradient-to-br from-purple-50 to-white">
                <div className="text-center">
                  <div className="mb-4">
                    <Zap className="h-12 w-12 text-purple-600 mx-auto" />
                  </div>
                  <div className="relative h-48 mb-6 flex items-center justify-center">
                    {/* Dashboard icon representation */}
                    <div className="grid grid-cols-2 gap-3 w-32">
                      <div className="h-12 bg-purple-200 rounded animate-pulse"></div>
                      <div className="h-12 bg-purple-300 rounded animate-pulse" style={{animationDelay: '0.2s'}}></div>
                      <div className="h-12 bg-purple-400 rounded animate-pulse" style={{animationDelay: '0.4s'}}></div>
                      <div className="h-12 bg-purple-500 rounded animate-pulse" style={{animationDelay: '0.6s'}}></div>
                    </div>
                  </div>
                  <h4 className="text-3xl font-bold text-purple-600 mb-2">100%</h4>
                  <p className="text-gray-600">visibilidad en tiempo real</p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Todo lo que necesitas en un solo lugar
            </h2>
            <p className="text-xl text-gray-600">
              Funcionalidades diseñadas para manufactura y producción
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="bg-blue-100 p-3 rounded-lg w-fit mb-4">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900">Gestión de proyectos</h3>
                <p className="text-gray-600 leading-relaxed">
                  Crea proyectos, define productos y etapas. Seguimiento desde cotización hasta entrega.
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="bg-green-100 p-3 rounded-lg w-fit mb-4">
                  <Layers className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900">Control de etapas</h3>
                <p className="text-gray-600 leading-relaxed">
                  Define el flujo de producción de tu empresa. Cada trabajador ve solo sus tareas.
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="bg-purple-100 p-3 rounded-lg w-fit mb-4">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900">Materiales y BOM</h3>
                <p className="text-gray-600 leading-relaxed">
                  Bill of Materials automático. Calcula exactamente qué y cuánto necesitas.
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="bg-orange-100 p-3 rounded-lg w-fit mb-4">
                  <DollarSign className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900">Finanzas y costos</h3>
                <p className="text-gray-600 leading-relaxed">
                  Registra gastos, ingresos y pagos. Margen real de cada proyecto en vivo.
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-indigo-500 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="bg-indigo-100 p-3 rounded-lg w-fit mb-4">
                  <Calendar className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900">Plazos y deadlines</h3>
                <p className="text-gray-600 leading-relaxed">
                  Timeline claro con fechas clave y alertas automáticas para cada deadline.
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-pink-500 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="bg-pink-100 p-3 rounded-lg w-fit mb-4">
                  <Users className="h-6 w-6 text-pink-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900">Roles y permisos</h3>
                <p className="text-gray-600 leading-relaxed">
                  Admin, Viewer, Worker. Cada usuario ve solo lo que debe. Control total.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-4 bg-white/50 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Así de simple
            </h2>
            <p className="text-xl text-gray-600">
              De cero a producción organizada en 3 pasos
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="relative border-t-4 border-t-blue-500 hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="bg-blue-600 text-white w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold mb-6 shadow-lg">
                  1
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Configura tu empresa</h3>
                <p className="text-gray-600 leading-relaxed">
                  Define productos, materiales y etapas de tu proceso de manufactura. Una sola vez.
                </p>
              </CardContent>
            </Card>

            <Card className="relative border-t-4 border-t-green-500 hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="bg-green-600 text-white w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold mb-6 shadow-lg">
                  2
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Invita a tu equipo</h3>
                <p className="text-gray-600 leading-relaxed">
                  Agrega usuarios y asigna permisos. Cada quien ve solo lo que le corresponde.
                </p>
              </CardContent>
            </Card>

            <Card className="relative border-t-4 border-t-purple-500 hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="bg-purple-600 text-white w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold mb-6 shadow-lg">
                  3
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Lanza proyectos</h3>
                <p className="text-gray-600 leading-relaxed">
                  Crea proyectos y monitorea en tiempo real. Todo tu equipo sincronizado.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-4 bg-gradient-to-br from-slate-50 via-white to-blue-50/20 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block mb-4">
              <span className="bg-blue-100 text-blue-600 px-4 py-2 rounded-full text-sm font-semibold">
                FAQ
              </span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Preguntas frecuentes
            </h2>
            <p className="text-xl text-gray-600">Todo lo que necesitas saber sobre Flowbiit</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                q: '¿Necesito instalar algo?',
                a: 'No. Flowbiit funciona 100% en la nube. Solo necesitas un navegador web y conexión a internet.'
              },
              {
                q: '¿Cuántos usuarios puedo tener?',
                a: 'Sin límite. Puedes tener tantos usuarios como necesites para tu operación.'
              },
              {
                q: '¿Puedo migrar mis datos actuales?',
                a: 'Sí. Te ayudamos a migrar tus datos de Excel u otros sistemas durante el onboarding.'
              },
              {
                q: '¿Funciona en móvil?',
                a: 'Sí. Flowbiit está optimizado para móvil, tablet y escritorio. Tu equipo puede trabajar desde cualquier dispositivo.'
              },
              {
                q: '¿Qué incluye la demo?',
                a: 'Te mostramos la plataforma funcionando con datos de ejemplo similar a tu negocio y resolvemos todas tus dudas.'
              },
              {
                q: '¿Ofrecen soporte técnico?',
                a: 'Sí. Incluimos soporte por email y videollamada durante el horario laboral.'
              }
            ].map((faq, index) => (
              <Card key={index} className="overflow-hidden hover:shadow-xl transition-all duration-300 border-l-4 border-l-blue-500 bg-white">
                <button
                  className="w-full px-6 py-5 flex items-center justify-between hover:bg-blue-50/50 transition-colors text-left group"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                >
                  <span className="font-semibold text-lg text-gray-900 group-hover:text-blue-600 transition-colors pr-4">
                    {faq.q}
                  </span>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 group-hover:bg-blue-600 flex items-center justify-center transition-all duration-300 ${openFaq === index ? 'bg-blue-600' : ''}`}>
                    <ChevronDown className={`h-5 w-5 transition-all duration-300 ${openFaq === index ? 'rotate-180 text-white' : 'text-blue-600 group-hover:text-white'}`} />
                  </div>
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-5 text-gray-600 leading-relaxed animate-in slide-in-from-top-2">
                    {faq.a}
                  </div>
                )}
              </Card>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-gray-600 mb-4">¿No encuentras lo que buscas?</p>
            <Button size="lg" variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50" asChild>
              <a href="#demo">Contacta con nosotros</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Contact Form - CTA Final */}
      <section id="demo" className="py-24 px-4 bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 relative z-10 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"></div>
        
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="text-white">
              <h2 className="text-4xl lg:text-6xl font-extrabold mb-6 leading-tight">
                ¿Listo para organizarte?
              </h2>
              <p className="text-xl text-blue-50 mb-10 leading-relaxed font-light">
                Agenda una demo personalizada y descubre cómo Flowbiit puede transformar tu operación de producción.
              </p>
              <div className="space-y-5">
                <div className="flex items-start gap-4 group">
                  <div className="bg-green-400/20 p-2 rounded-full mt-0.5">
                    <CheckCircle2 className="h-5 w-5 text-green-300 flex-shrink-0" />
                  </div>
                  <div>
                    <span className="text-lg font-medium block">Demo personalizada para tu industria</span>
                    <span className="text-blue-200 text-sm">Adaptada a tus necesidades específicas</span>
                  </div>
                </div>
                <div className="flex items-start gap-4 group">
                  <div className="bg-green-400/20 p-2 rounded-full mt-0.5">
                    <CheckCircle2 className="h-5 w-5 text-green-300 flex-shrink-0" />
                  </div>
                  <div>
                    <span className="text-lg font-medium block">Sin compromiso ni pagos previos</span>
                    <span className="text-blue-200 text-sm">Explora la plataforma sin presión</span>
                  </div>
                </div>
                <div className="flex items-start gap-4 group">
                  <div className="bg-green-400/20 p-2 rounded-full mt-0.5">
                    <CheckCircle2 className="h-5 w-5 text-green-300 flex-shrink-0" />
                  </div>
                  <div>
                    <span className="text-lg font-medium block">Respuesta en menos de 24 horas</span>
                    <span className="text-blue-200 text-sm">Nuestro equipo te contactará pronto</span>
                  </div>
                </div>
              </div>
            </div>

            <Card className="shadow-2xl border-none bg-white/95 backdrop-blur-sm">
              <CardContent className="p-8">
                <form action="https://api.web3forms.com/submit" method="POST" className="space-y-5">
                  <input type="hidden" name="access_key" value="61a3f342-c112-4f45-83ca-6ccffec33e78" />
                  <input type="hidden" name="subject" value="Nueva solicitud de demo desde Flowbiit" />
                  <input type="hidden" name="from_name" value="Flowbiit Landing" />
                  
                  <div>
                    <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                      Nombre completo
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                      placeholder="Tu nombre"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                      placeholder="tu@email.com"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                      Teléfono
                    </label>
                    <div className="flex gap-3">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="w-28 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all bg-white text-gray-900 font-medium cursor-pointer hover:border-gray-400 appearance-none text-center"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                          backgroundPosition: 'right 0.5rem center',
                          backgroundRepeat: 'no-repeat',
                          backgroundSize: '1.5em 1.5em',
                          paddingRight: '2.5rem'
                        }}
                      >
                        <option value="+57">🇨🇴 +57</option>
                        <option value="+52">🇲🇽 +52</option>
                        <option value="+1">🇺🇸 +1</option>
                        <option value="+54">🇦🇷 +54</option>
                        <option value="+56">🇨🇱 +56</option>
                        <option value="+51">🇵🇪 +51</option>
                        <option value="+593">🇪🇨 +593</option>
                        <option value="+58">🇻🇪 +58</option>
                        <option value="+34">🇪🇸 +34</option>
                        <option value="+55">🇧🇷 +55</option>
                      </select>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                        placeholder="123 456 7890"
                        required
                      />
                      <input type="hidden" name="country_code" value={countryCode} />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-semibold text-gray-700 mb-2">
                      Cuéntanos sobre tu empresa
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all resize-none"
                      placeholder="¿Qué produces? ¿Cuántas personas trabajáis?"
                      required
                    />
                  </div>

                  <Button 
                    type="submit" 
                    size="lg" 
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-lg shadow-lg hover:shadow-xl transition-all duration-300 font-semibold"
                  >
                    Agendar demo gratuita
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  
                  <p className="text-center text-xs text-gray-500 mt-4">
                    Al enviar este formulario, aceptas que te contactemos sobre Flowbiit
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <img src={flowbitLogoBlanco} alt="Flowbit" className="h-36 mx-auto mb-2" />
          <div className="border-t border-gray-800 pt-8 text-gray-400">
            <p>&copy; 2026 Flowbiit. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
