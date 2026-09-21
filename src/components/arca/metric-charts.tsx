import { TrendingUp } from "lucide-react"
import { useReducedMotion } from "motion/react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const MONTHS = [
  { month: "Jan", desktop: 186, mobile: 80, share: 42, traffic: 186 },
  { month: "Feb", desktop: 305, mobile: 200, share: 88, traffic: 305 },
  { month: "Mar", desktop: 237, mobile: 120, share: 74, traffic: 237 },
  { month: "Apr", desktop: 73, mobile: 190, share: 28, traffic: 173 },
  { month: "May", desktop: 209, mobile: 130, share: 64, traffic: 209 },
  { month: "Jun", desktop: 214, mobile: 140, share: 71, traffic: 214 },
]

const RADIAL_DATA = [{ name: "Score", value: 78, fill: "var(--chart-2)" }]

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--popover-foreground)",
  boxShadow: "none",
}

const tooltipProps = {
  contentStyle: tooltipStyle,
  cursor: { fill: "var(--muted)", fillOpacity: 0.35 },
}

export function MetricCharts() {
  const reduce = useReducedMotion() ?? false

  return (
    <div className="grid w-full gap-4 md:grid-cols-2">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Website Traffic</CardTitle>
          <CardDescription>Monthly visitor behavior patterns</CardDescription>
          <CardAction>
            <Badge variant="outline" className="font-normal text-emerald-600 dark:text-emerald-400">
              <TrendingUp />
              +8%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MONTHS} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="arca-area-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <Tooltip {...tooltipProps} />
                <Area
                  type="natural"
                  dataKey="traffic"
                  name="Visitors"
                  stroke="var(--chart-2)"
                  fill="url(#arca-area-fill)"
                  strokeWidth={2}
                  isAnimationActive={!reduce}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
        <CardFooter className="text-muted-foreground">
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="size-4" />
            Trending up by 8% this month
          </div>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Market Share</CardTitle>
          <CardDescription>Departmental performance comparison</CardDescription>
          <CardAction>
            <Badge variant="outline" className="font-normal text-amber-700 dark:text-amber-400">
              <TrendingUp />
              +12%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MONTHS} margin={{ top: 8, right: 4, left: -18, bottom: 0 }} barGap={4}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <Tooltip {...tooltipProps} />
                <Bar
                  dataKey="desktop"
                  name="Desktop"
                  fill="var(--chart-1)"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={!reduce}
                />
                <Bar
                  dataKey="mobile"
                  name="Mobile"
                  fill="var(--chart-3)"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={!reduce}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Average Score</CardTitle>
          <CardDescription>Team performance this quarter</CardDescription>
          <CardAction>
            <Badge variant="outline">78%</Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="relative mx-auto h-[200px] w-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                data={RADIAL_DATA}
                innerRadius="62%"
                outerRadius="100%"
                startAngle={90}
                endAngle={-270}
                barSize={14}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar
                  dataKey="value"
                  background={{ fill: "var(--muted)" }}
                  cornerRadius={8}
                  isAnimationActive={!reduce}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-2xl font-semibold tabular-nums">78%</p>
                <p className="text-[11px] text-muted-foreground">Complete</p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="text-muted-foreground">
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="size-4" />
            On track for quarterly target
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

export function MetricChartsDemo() {
  return <MetricCharts />
}
