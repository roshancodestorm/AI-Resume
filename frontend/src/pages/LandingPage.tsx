import { Link } from 'react-router-dom'
import { FileText, Sparkles, Briefcase, BarChart2, Download, ArrowRight } from 'lucide-react'

const features = [
  { icon: Sparkles, title: 'AI-Powered Builder', desc: 'GPT-4 rewrites your bullets to be impactful, quantified, and ATS-friendly.' },
  { icon: BarChart2, title: 'Resume Analyzer', desc: 'Get a scored report card on your resume with specific improvement tips.' },
  { icon: Briefcase, title: 'Job Match', desc: 'Paste a job description and instantly see your match score and keyword gaps.' },
  { icon: Download, title: 'PDF Export', desc: '3 professional templates — Classic, Modern, and Minimal — download-ready.' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-600 via-primary-700 to-indigo-800 text-white">
        <div className="max-w-5xl mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm mb-6">
            <Sparkles className="w-4 h-4" /> Powered by GPT-4
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold leading-tight mb-6">
            Land your next job with<br />
            <span className="text-primary-200">AI-crafted resumes</span>
          </h1>
          <p className="text-xl text-primary-100 max-w-2xl mx-auto mb-10">
            Build, analyze, and optimize your resume with the power of AI. Match it against job descriptions and export a polished PDF in minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="bg-white text-primary-700 font-semibold px-8 py-3.5 rounded-xl hover:bg-primary-50 transition-colors flex items-center gap-2 justify-center">
              Get started free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/login" className="bg-white/10 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/20 transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Everything you need to get hired</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card card-body text-center hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Icon className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-900 text-white text-center py-20">
        <FileText className="w-12 h-12 text-primary-400 mx-auto mb-4" />
        <h2 className="text-3xl font-bold mb-4">Ready to build a better resume?</h2>
        <p className="text-gray-400 mb-8">Join thousands of job seekers using AI to land their dream roles.</p>
        <Link to="/register" className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-10 py-3.5 rounded-xl transition-colors inline-flex items-center gap-2">
          Create your free account <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  )
}
