/**
 * sample-resume.js — Default resume content from resume_sonu_raj.pdf
 */

export const SAMPLE_RESUME = {
  name: "Sonu Raj",
  phone: "+91 9472444514",
  email: "sonurajgupta2003@gmail.com",
  location: "Jaipur, Rajasthan, India",
  workPrefs: ["remote", "onsite"],
  linkedin: "https://www.linkedin.com/in/sonu-raj-62042425a",
  github: "https://github.com/Sonuraj48",
  portfolio: "https://sonu-raj-portfolio.netlify.app/",

  summary:
    "Motivated B.Tech Computer Science student with hands-on experience in Python, AI/ML, and full-stack web development. Passionate about building intelligent applications and scalable systems. Seeking opportunities to contribute to innovative projects while growing technical and collaborative skills.",

  experience: [
    {
      title: "Intern",
      dates: "Jun '25 — Aug '25",
      company: "LinuxWorld Informatics Pvt Ltd",
      location: "JAIPUR, India",
      intro:
        "Contributed to real-world projects in a fast-paced environment, including a dashboard project using modern web technologies and team-based delivery.",
      bullets:
        "Built and enhanced features using Python, JavaScript, and web frameworks\nCollaborated on deployment, testing, and documentation for production-ready modules\nStrengthened problem-solving and communication skills through daily stand-ups and code reviews",
    },
  ],

  education: [
    {
      degree: "Bachelor of Technology in CSE",
      school: "Vivekananda Global University",
      grade: "GPA: 8.2",
      dates: "Sep '22 — Present",
      location: "Jaipur, India",
    },
    {
      degree: "Senior Secondary (Class 12 CBSE)",
      school: "Aklank Public School",
      grade: "percentage: 86.6%",
      dates: "2021",
      location: "Kota, India",
    },
    {
      degree: "Secondary (Class 10 CBSE)",
      school: "Notre Dame Public School",
      grade: "percentage: 91.4%",
      dates: "2019",
      location: "Bettiah, India",
    },
  ],

  certifications: [
    { name: "Get Started with Python", provider: "Google" },
    { name: "Python for Data Science", provider: "IBM" },
    { name: "Introduction to DevOps", provider: "Coursera" },
  ],

  projects: [
    {
      title: "AI Virtual Health Assistant",
      url: "https://ai-virtual-health-assistant-ai-creator.streamlit.app/",
      bullets:
        "Built an AI-powered health assistant using Python and Streamlit\nIntegrated symptom analysis and user-friendly chat interface\nDeployed application for real-time user interaction",
    },
    {
      title: "DevOps CI/CD Pipeline Project",
      url: "https://www.linkedin.com/posts/sonu-raj-62042425a_devops-docker-jenkins-activity-7349708336222650368-WVvr",
      bullets:
        "Designed CI/CD workflow using Docker and Jenkins\nAutomated build and deployment stages for faster delivery\nDocumented pipeline setup and troubleshooting steps",
    },
  ],

  skills: [
    { category: "Programming Languages", items: "Python, Java, C++, JavaScript, SQL" },
    { category: "AI/ML", items: "Machine Learning basics, scikit-learn, TensorFlow, OpenCV, NLP fundamentals" },
    { category: "Web", items: "HTML, CSS, JavaScript, React, Node.js, REST APIs" },
    { category: "DevOps & Cloud", items: "Docker, Jenkins, Git, GitHub Actions, AWS basics" },
    { category: "Data & Visualization", items: "Pandas, NumPy, Matplotlib, Power BI" },
    {
      category: "Interpersonal & Collaboration Skills",
      items: "Teamwork, Communication, Agile collaboration, Technical documentation",
    },
  ],
};
