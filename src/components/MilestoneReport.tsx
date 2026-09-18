import type { ReportSnapshot } from '@/lib/reports/reportTypes';
import { activityGoal, count, money, reportDate, reportTimestamp, reportTitle } from '@/lib/reports/milestoneFormat';
import AchievementArtwork from './AchievementArtwork';
import type { BadgeArtwork } from '@/lib/achievements/badgeDesign';
import styles from './MilestoneReport.module.css';

export default function MilestoneReport({report}: {report:ReportSnapshot}) {
 return <article className={styles.paper} aria-label={`${reportTitle(report.milestone)} for ${report.member_name}`}>
   <header className={styles.masthead}>
     <p className={styles.brand}>ROCKETFUEL</p>
     <p className={styles.eyebrow}>YOUR PROGRESS, RECORDED</p>
     <h1>{reportTitle(report.milestone)}</h1>
     <p className={styles.member}>{report.member_name}</p>
     <p className={styles.dates}>{reportDate(report.period_start)} — {reportDate(report.period_end)}</p>
     <div className={styles.headerRule}><span>{report.days} days of your course</span><span>{report.milestone === 'final' ? 'Course complete' : `Day ${report.days} of ${report.course_days}`}</span></div>
   </header>
   <section className={styles.activity} aria-labelledby="report-activity">
    <div className={styles.sectionHeading}><p className={styles.eyebrow}>THE WORK YOU PUT IN</p><h2 id="report-activity">Your activity</h2><p>Your recorded activity, alongside your goals for these {report.days} days.</p></div>
    {report.activities.map(row=>{ const goal=activityGoal(row); return <div className={styles.metric} key={row.key}>
      <div className={styles.metricTop}><div><h3>{row.label}</h3><p className={goal.status.endsWith('reached')?styles.reached:styles.muted}>{goal.status}</p></div><strong>{row.actual === null ? '—' : count(row.actual)}<small>recorded</small></strong></div>
      <div className={styles.track} role="img" aria-label={`${count(row.actual)} recorded, minimum ${count(row.minimum)}, optimum ${count(row.optimum)}`}><div className={styles.fill} style={{width:`${goal.fill*100}%`,background:goal.fill>=1?'#287650':'#183552'}}/>{goal.marker!==null && <span className={styles.marker} style={{left:`${goal.marker*100}%`}}/>}</div>
      <div className={styles.targets}>{goal.single ? <span>Goal <b>{count(row.minimum)}</b></span> : <><span>Minimum <b>{count(row.minimum)}</b></span><span>Optimum <b>{count(row.optimum)}</b></span></>}</div>
    </div>})}
    <p className={styles.footnote}>Goals reflect weekly targets across the {report.days} days in this report, rounded up to whole activities.</p>
   </section>
   <section className={styles.business} aria-labelledby="report-business">
     <p className={styles.eyebrow}>RELATIONSHIPS & RESULTS</p><h2 id="report-business">Your business</h2>
     <dl><div><dt>15/30 pipeline<small>Working range: 15–30 contacts</small></dt><dd>{count(report.business.pipeline_count)}</dd></div><div><dt>Estimated pipeline value<small>Potential business in your pipeline</small></dt><dd>{money(report.business.pipeline_value)}</dd></div><div><dt>Reported gross revenue<small>Logged during this report period</small></dt><dd>{money(report.business.gross_revenue)}</dd></div></dl>
     <p className={styles.footnote}>{report.business.pipeline_status==='recorded' && report.business.pipeline_as_of ? `Pipeline captured ${reportTimestamp(report.business.pipeline_as_of,report.reporting_timezone)}. Estimated pipeline value and reported revenue are separate figures.` : 'A historical pipeline snapshot is not available for this report. Activity and reported revenue remain included.'}</p>
   </section>
   {report.achievements.length>0 && <section className={styles.achievements} aria-labelledby="report-achievements"><p className={styles.eyebrow}>EARNED ALONG THE WAY</p><h2 id="report-achievements">Moments worth keeping</h2><div className={styles.medals}>{report.achievements.slice(0,3).map(medal=><div key={medal.key}><details className={styles.medalDetails}><summary><AchievementArtwork artwork={medal.artwork as BadgeArtwork} shape={medal.shape} tier={medal.tier} size={140}/><h3>{medal.title}</h3><p>{medal.tier}</p><span className={styles.disclosure}>View details</span></summary><p className={styles.description}>{medal.description || "No description was saved with this achievement."}</p></details></div>)}</div></section>}
   <footer className={styles.footer}><span>ROCKETFUEL</span><span>Saved {reportTimestamp(report.generated_at,report.reporting_timezone)}{report.revision>1 ? ` · Updated version ${report.revision}` : ''}</span></footer>
 </article>;
}
