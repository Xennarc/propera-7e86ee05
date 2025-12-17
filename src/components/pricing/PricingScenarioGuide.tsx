import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Map, Globe, ArrowRight, Check } from 'lucide-react';
import { useState } from 'react';

interface ScenarioState {
  properties: string | null;
  loyalty: string | null;
  prearrival: string | null;
}

const QUESTIONS = [
  {
    id: 'properties',
    question: 'How many properties do you operate?',
    options: [
      { value: '1', label: '1 property', icon: Building2 },
      { value: '2-5', label: '2–5 properties', icon: Map },
      { value: '6+', label: '6+ properties', icon: Globe },
    ],
  },
  {
    id: 'loyalty',
    question: 'Do you need a guest loyalty program?',
    options: [
      { value: 'yes', label: 'Yes, loyalty is key' },
      { value: 'no', label: 'Not right now' },
    ],
  },
  {
    id: 'prearrival',
    question: 'Want guests to book before they arrive?',
    options: [
      { value: 'yes', label: 'Yes, pre-arrival matters' },
      { value: 'no', label: 'In-stay is enough' },
    ],
  },
];

function getRecommendation(state: ScenarioState): { plan: string; reason: string } {
  if (state.properties === '6+' || state.loyalty === 'yes') {
    return { 
      plan: 'Elite', 
      reason: 'Best for portfolio analytics, loyalty programs, and AI-powered insights.'
    };
  }
  if (state.properties === '2-5' || state.prearrival === 'yes') {
    return { 
      plan: 'Professional', 
      reason: 'Perfect for multi-outlet coordination, pre-arrival, and detailed reporting.'
    };
  }
  return { 
    plan: 'Essential', 
    reason: 'Great starting point for centralised booking and guest self-service.'
  };
}

export function PricingScenarioGuide() {
  const [answers, setAnswers] = useState<ScenarioState>({
    properties: null,
    loyalty: null,
    prearrival: null,
  });
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const handleAnswer = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    if (currentQuestion < QUESTIONS.length - 1) {
      setTimeout(() => setCurrentQuestion(prev => prev + 1), 300);
    }
  };

  const isComplete = answers.properties && answers.loyalty && answers.prearrival;
  const recommendation = getRecommendation(answers);

  const reset = () => {
    setAnswers({ properties: null, loyalty: null, prearrival: null });
    setCurrentQuestion(0);
  };

  return (
    <section className="py-20 md:py-28 bg-background relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Which plan is right for you?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Answer a few quick questions to find your perfect fit.
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto">
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {QUESTIONS.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-12 rounded-full transition-all duration-300 ${
                  index < currentQuestion 
                    ? 'bg-primary' 
                    : index === currentQuestion 
                    ? 'bg-primary/50' 
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Questions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {QUESTIONS.map((question, qIndex) => {
              const isActive = qIndex === currentQuestion;
              const isAnswered = answers[question.id as keyof ScenarioState] !== null;
              
              if (qIndex > currentQuestion && !isComplete) return null;
              
              return (
                <motion.div
                  key={question.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: qIndex * 0.1 }}
                  className={`transition-all duration-300 ${
                    isActive ? 'opacity-100' : 'opacity-60'
                  }`}
                >
                  <Card className={`overflow-hidden transition-all duration-300 ${
                    isActive ? 'border-primary/30 shadow-lg' : 'border-border/50'
                  }`}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          isAnswered ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}>
                          {isAnswered ? <Check className="h-4 w-4" /> : qIndex + 1}
                        </div>
                        <h3 className="text-lg font-semibold text-foreground">{question.question}</h3>
                      </div>
                      
                      <div className={`grid gap-3 ${question.options.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                        {question.options.map((option) => {
                          const isSelected = answers[question.id as keyof ScenarioState] === option.value;
                          const Icon = option.icon;
                          
                          return (
                            <motion.button
                              key={option.value}
                              onClick={() => handleAnswer(question.id, option.value)}
                              className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                                isSelected 
                                  ? 'border-primary bg-primary/5 shadow-md' 
                                  : 'border-border/50 hover:border-primary/30 hover:bg-muted/50'
                              }`}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <div className="flex items-center gap-3">
                                {Icon && (
                                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                                    isSelected ? 'bg-primary/10' : 'bg-muted'
                                  }`}>
                                    <Icon className={`h-5 w-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                                  </div>
                                )}
                                <span className={`font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                                  {option.label}
                                </span>
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Recommendation */}
          {isComplete && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-10"
            >
              <Card className={`overflow-hidden ${
                recommendation.plan === 'Elite' 
                  ? 'border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-purple-500/5' 
                  : recommendation.plan === 'Professional'
                  ? 'border-primary/30 bg-gradient-to-br from-primary/5 to-primary/0'
                  : 'border-border'
              }`}>
                <CardContent className="p-8 text-center">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-4 ${
                    recommendation.plan === 'Elite' 
                      ? 'bg-violet-500/10 text-violet-500' 
                      : recommendation.plan === 'Professional'
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-foreground'
                  }`}>
                    <Check className="h-4 w-4" />
                    We recommend
                  </div>
                  
                  <h3 className={`text-3xl font-bold mb-3 ${
                    recommendation.plan === 'Elite' ? 'text-violet-500' : 
                    recommendation.plan === 'Professional' ? 'text-primary' : 'text-foreground'
                  }`}>
                    {recommendation.plan}
                  </h3>
                  
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    {recommendation.reason}
                  </p>
                  
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Button 
                      asChild
                      className={`rounded-full px-8 h-12 font-semibold ${
                        recommendation.plan === 'Elite' 
                          ? 'bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white' 
                          : ''
                      }`}
                    >
                      <a href="mailto:hello@propera.cc?subject=Demo Request">
                        Book a demo
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                    <Button variant="ghost" onClick={reset} className="rounded-full">
                      Start over
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
