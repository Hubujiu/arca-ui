import { Bell, Check } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/motion/select"
import { Switch } from "@/components/ui/switch"

const NOTIFICATIONS = [
  {
    title: "Your call has been confirmed.",
    description: "1 hour ago",
  },
  {
    title: "You have a new message.",
    description: "1 hour ago",
  },
  {
    title: "Your subscription is expiring soon.",
    description: "2 hours ago",
  },
]

const TEAM = [
  {
    name: "Sofia Davis",
    email: "m@example.com",
    initials: "SD",
    role: "owner",
  },
  {
    name: "Jackson Lee",
    email: "p@example.com",
    initials: "JL",
    role: "developer",
  },
  {
    name: "Isabella Nguyen",
    email: "i@example.com",
    initials: "IN",
    role: "viewer",
  },
]

export function FeatureCardsDemo() {
  return (
    <div className="grid w-full gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>You have 3 unread messages.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center gap-4 rounded-lg border p-4">
            <Bell className="size-5 shrink-0" />
            <div className="flex-1 space-y-1">
              <p className="text-sm leading-none font-medium">Push Notifications</p>
              <p className="text-sm text-muted-foreground">Send notifications to device.</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div>
            {NOTIFICATIONS.map((item) => (
              <div
                key={item.title}
                className="mb-4 grid grid-cols-[25px_1fr] items-start pb-4 last:mb-0 last:pb-0"
              >
                <span className="flex size-2 translate-y-1 rounded-full bg-sky-500" />
                <div className="space-y-1">
                  <p className="text-sm leading-none font-medium">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full">
            <Check />
            Mark all as read
          </Button>
        </CardFooter>
      </Card>

      <Card className="overflow-visible">
        <CardHeader>
          <CardTitle>Create project</CardTitle>
          <CardDescription>Deploy your new project in one-click.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="project-name">Name</Label>
            <Input id="project-name" placeholder="Name of your project" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="project-framework">Framework</Label>
            <Select defaultValue="next">
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="next">Next.js</SelectItem>
                <SelectItem value="sveltekit">SvelteKit</SelectItem>
                <SelectItem value="astro">Astro</SelectItem>
                <SelectItem value="nuxt">Nuxt.js</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter className="justify-between gap-2">
          <Button variant="outline">Cancel</Button>
          <Button>Deploy</Button>
        </CardFooter>
      </Card>

      <Card className="overflow-visible">
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>Invite your team to collaborate.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          {TEAM.map((person) => (
            <div key={person.email} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar size="sm">
                  <AvatarFallback>{person.initials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm leading-none font-medium">{person.name}</p>
                  <p className="text-sm text-muted-foreground">{person.email}</p>
                </div>
              </div>
              <Select defaultValue={person.role}>
                <SelectTrigger className="w-[118px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="developer">Developer</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cookie Settings</CardTitle>
          <CardDescription>Manage your cookie preferences here.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="cookie-necessary" className="flex flex-col items-start gap-1">
              <span>Strictly Necessary</span>
              <span className="font-normal leading-snug text-muted-foreground">
                These cookies are essential in order to use the website.
              </span>
            </Label>
            <Switch id="cookie-necessary" defaultChecked disabled />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="cookie-functional" className="flex flex-col items-start gap-1">
              <span>Functional Cookies</span>
              <span className="font-normal leading-snug text-muted-foreground">
                These cookies allow the website to remember your preferences.
              </span>
            </Label>
            <Switch id="cookie-functional" defaultChecked />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="cookie-performance" className="flex flex-col items-start gap-1">
              <span>Performance Cookies</span>
              <span className="font-normal leading-snug text-muted-foreground">
                These cookies help us improve the product.
              </span>
            </Label>
            <Switch id="cookie-performance" />
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full">
            Save preferences
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
