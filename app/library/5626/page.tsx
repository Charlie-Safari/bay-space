import Link from "next/link";
import HomeBar from "../../components/home-bar";
import TranscriptTerminal from "./transcript-terminal";

const subtitleBars = [
  "So, not only do we have to understand what people are allowed to do, the CIA basically issues findings. The president signs off on them, and then the CIA can act. We already knew about that.",
  "But now we need to understand the groups within the CIA. The people inside the CIA are career bureaucrats. They are the ones who have been there for decades and move into the highest internal positions.",
  "Those directorate positions sit over the major branches. Annie is going to help us break down the different directorates under the CIA and which one matters most here.",
  "The Directorate of Science and Technology is the one we care about most. It is described here as the home of weird black projects involving advanced physics, plasma technology, quantum research, vacuum engineering, and exotic propulsion.",
  "If the orbs, torque-driven furies, and 5D coupling technology exist, this argument says they were almost certainly developed inside DS&T.",
  "The Directorate of Operations is the spy side. These are the people who run covert operations on the ground. If someone physically made MH370 disappear, this is where that kind of operation would connect.",
  "The Directorate of Analysis studies intelligence and writes reports. They may have known about an operation, but they would not have run it.",
  "The Special Activities Center is the paramilitary side: black helicopters, special operations teams, and rendition flights. If there were boots on the ground near Diego Garcia, this is the group that would have handled it.",
  "The directorate of interest is Science and Technology. The spinning plasma orbs, relativistic plasma mirrors, torque as a 5D bridge, and the Pais effect are all framed as DS&T territory.",
  "So now we can see the CIA structure more clearly: personnel, analysis, logistics, plans, and science. A black operation could be so compartmentalized that only a tiny number of people inside the CIA would know about it.",
  "The analytics side could pull data, calls, and engineering evidence. The logistics side could handle retrievals or movement. The plans side would orchestrate the operation.",
  "In this theory, planners decide to put a device on MH370, cause the plane to deviate, monitor it with two drones, and coordinate with the science and technology directorate when plasma orbs are used.",
  "Science and Technology is the branch said to be doing far more than the public understands. The claim is that this should be front page news.",
  "The public may think the CIA is mainly spycraft, not secret surveillance, plasma physics, cutting-edge science, and technology that could manipulate space-time.",
  "The argument is that hiding this under crash retrievals and alien narratives misses the point. The stronger public-interest claim is that a government science branch is building powerful technology in secret.",
  "The allegation is that this hidden technology lets insiders know which companies will succeed before the public does. That is framed as corruption regardless of the specific technology.",
  "The speaker argues that this has been happening at scale for decades, and that people simply have not been paying attention.",
  "Castle Bravo is brought in as a turning point. The claim is that an explosion has an inverse: an implosion, an endothermic counterpart to an exothermic event.",
  "That duality is then linked to quantum entanglement and space-time manipulation. Once that connection was recognized, the argument says, physics could be solved in classified channels.",
  "The problem is that the papers and programs are classified. Only people with clearances and nondisclosure agreements can see them.",
  "So exposing the programs through classical channels may be impossible. The speaker argues that many of these black programs may not be illegal at all. They may be legally classified.",
  "Because the public does not know they exist, the public has no practical way to challenge their legality.",
  "The proposed strategy is to expose weaknesses and focus attention on the CIA Directorate of Science and Technology, much as UFO investigators focus on hidden programs.",
  "The political angle returns with reporting that Tulsi Gabbard planned to move oversight of a CIA-backed high-tech venture fund to her office.",
  "That venture fund helped launch companies and technologies associated with Palantir and Google Earth.",
  "The claim connects the look of the Gorgon Stare video to Google Earth by saying the same institutional world produced both.",
  "In-Q-Tel is described as having sat under the CIA Science and Technology Directorate, which makes any shift in its oversight significant for people watching disclosure politics.",
  "The speaker argues that if an administration says it wants disclosure, it is notable that it would move a major high-tech instrument away from that exact CIA branch.",
  "The question becomes who has the technology and whether national leaders know about it. The answer given here is that Trump knows.",
  "Marco Rubio is raised as another example. The speaker says Rubio previously treated UFOs as a serious threat and seemed genuinely concerned.",
  "Then Rubio entered senior national security roles and stopped speaking about the threat. The argument is that he learned the technology was American and no longer saw it the same way.",
  "If leaders learn that the United States has secret orb technology, the speaker argues, that changes the advice they give on the geopolitical stage.",
];

export default function Library5626() {
  return (
    <main className="min-h-screen bg-[#020402] text-[#39ff14] font-mono">
      <HomeBar />

      <article className="mx-auto flex min-h-[calc(100vh-89px)] w-full max-w-6xl flex-col justify-center px-4 py-16">
        <Link
          href="/library"
          className="mb-8 w-fit border border-[#39ff14] px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
        >
          back
        </Link>

        <p className="mb-4 text-sm uppercase tracking-[0.32em] text-[#d7ffd0]">
          c:\bay-space\library\5626&gt; subtitle
        </p>
        <h1 className="max-w-5xl text-3xl font-black uppercase tracking-[0.12em] text-[#39ff14] [text-shadow:0_0_16px_#39ff14] sm:text-5xl">
          The CIA Directorate Nobody Knows Is Building the Orbs
        </h1>
        <p className="mt-4 text-sm font-bold uppercase tracking-[0.24em] text-[#d7ffd0]">
          Ashton Forbes
        </p>
        <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-[#9aa09a]/65">
          5 - 6 - 26
        </p>

        <TranscriptTerminal lines={subtitleBars} />
      </article>
    </main>
  );
}
