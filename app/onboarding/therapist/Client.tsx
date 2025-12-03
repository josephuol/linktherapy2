"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabaseBrowser } from "@/lib/supabase-browser"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, CheckCircle2, Upload, X, AlertCircle } from "lucide-react"

export default function TherapistOnboardingClient() {
  const supabase = supabaseBrowser()
  const params = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const PROFILE_BUCKET = process.env.NEXT_PUBLIC_PROFILE_BUCKET || "profile-images"

  const [hydrating, setHydrating] = useState(true)
  const [step, setStep] = useState<1 | 2>(1)

  // Form state
  const [fullName, setFullName] = useState("")
  const [title, setTitle] = useState("")
  const [bioShort, setBioShort] = useState("")
  const [bioLong, setBioLong] = useState("")
  const [religion, setReligion] = useState<string>("")
  const [ageRange, setAgeRange] = useState<string>("")
  const [yearsOfExperience, setYearsOfExperience] = useState<number | "">("")
  const [languages, setLanguages] = useState<string>("")
  const [interests, setInterests] = useState<string[]>([])
  const [interestsInput, setInterestsInput] = useState<string>("")
  const [gender, setGender] = useState<"male" | "female" | "other" | "">("")
  const [lgbtqFriendly, setLgbtqFriendly] = useState<boolean>(false)
  const [availableCities, setAvailableCities] = useState<string[]>([])
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [locationInput, setLocationInput] = useState<string>("")
  const [price45, setPrice45] = useState<number | "">("")
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [profileImagePreview, setProfileImagePreview] = useState<string>("")
  const [acceptTos, setAcceptTos] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const type = params.get("type")
    const access_token = params.get("access_token")
    const refresh_token = params.get("refresh_token")

    const fromHash = () => {
      if (typeof window === "undefined") return null
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""))
      const t = hash.get("access_token")
      const r = hash.get("refresh_token")
      const ty = hash.get("type")
      if (t && r) return { access_token: t, refresh_token: r, type: ty }
      return null
    }

    const hydrate = async () => {
      try {
        let at = access_token
        let rt = refresh_token
        if (!at || !rt) {
          const h = fromHash()
          if (h) {
            at = h.access_token
            rt = h.refresh_token
          }
        }
        if (at && rt) {
          await supabase.auth.setSession({ access_token: at, refresh_token: rt })
        }
      } finally {
        setHydrating(false)
      }
    }

    hydrate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const { data } = await supabase
          .from("site_content")
          .select("content")
          .eq("key", "match.quiz")
          .maybeSingle()
        const cities = (data as any)?.content?.options?.locations?.cities
        if (Array.isArray(cities) && cities.length) setAvailableCities(cities)
        else setAvailableCities(["Beirut","Zahle","Jounieh/Kaslik","Antelias","Aley","Tripoli","Jbeil","Dbayeh","Ajaltoun"])
      } catch {
        setAvailableCities(["Beirut","Zahle","Jounieh/Kaslik","Antelias","Aley","Tripoli","Jbeil","Dbayeh","Ajaltoun"])
      }
    })()
  }, [supabase])

  // Handle image file selection with preview
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Image too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive"
      })
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive"
      })
      return
    }

    setProfileImageFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setProfileImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!fullName.trim()) newErrors.fullName = "Full name is required"
    if (!title.trim()) newErrors.title = "Title is required"
    if (!bioShort.trim()) newErrors.bioShort = "Short bio is required"
    if (bioShort.length > 150) newErrors.bioShort = "Short bio must be under 150 characters"
    if (!bioLong.trim()) newErrors.bioLong = "Long bio is required"
    if (bioLong.length < 100) newErrors.bioLong = "Long bio should be at least 100 characters"
    if (!religion) newErrors.religion = "Religion is required"
    if (!ageRange) newErrors.ageRange = "Age range is required"
    if (yearsOfExperience === "") newErrors.yearsOfExperience = "Years of experience is required"
    if (!languages.trim()) newErrors.languages = "Languages are required"
    if (interests.length === 0) newErrors.interests = "At least one interest is required"
    if (price45 === "" || price45 < 0) newErrors.price45 = "Session price is required"
    if (!gender) newErrors.gender = "Gender is required"
    if (selectedLocations.length === 0) newErrors.locations = "At least one location is required"
    if (!acceptTos) newErrors.acceptTos = "You must accept the Terms of Service"

    setErrors(newErrors)

    if (Object.keys(newErrors).length > 0) {
      toast({
        title: "Please complete all required fields",
        description: `${Object.keys(newErrors).length} field(s) need attention`,
        variant: "destructive"
      })
      // Scroll to first error
      const firstErrorField = Object.keys(newErrors)[0]
      document.getElementById(firstErrorField)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return false
    }

    return true
  }

  const uploadImage = async (userId: string): Promise<string | undefined> => {
    if (!profileImageFile) return undefined

    try {
      setUploadingImage(true)
      const ext = profileImageFile.name.split(".").pop() || "jpg"
      const path = `${userId}/${Date.now()}.${ext}`

      const { error: upErr } = await supabase.storage
        .from(PROFILE_BUCKET)
        .upload(path, profileImageFile, { upsert: true, cacheControl: "3600" })

      if (upErr) {
        console.error("[Image Upload Error]", upErr)
        throw new Error(`Failed to upload image: ${upErr.message}`)
      }

      const { data: pub } = supabase.storage.from(PROFILE_BUCKET).getPublicUrl(path)
      return pub.publicUrl
    } catch (err: any) {
      toast({
        title: "Image upload failed",
        description: err.message || "Please try again",
        variant: "destructive"
      })
      throw err
    } finally {
      setUploadingImage(false)
    }
  }

  const onSaveProfile = useCallback(async () => {
    // Validate form
    if (!validateForm()) return

    setSavingProfile(true)

    try {
      // Get session and user
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const user = (await supabase.auth.getUser()).data.user

      if (!token || !user?.id) {
        toast({
          title: "Authentication error",
          description: "Please log in again",
          variant: "destructive"
        })
        return
      }

      // Upload profile image if provided
      let profileImageUrl: string | undefined
      if (profileImageFile) {
        try {
          profileImageUrl = await uploadImage(user.id)
        } catch (err) {
          // Image upload failed but allow user to continue without image
          console.error("Image upload failed, continuing without image")
        }
      }

      // Submit profile data
      const res = await fetch("/api/onboarding/therapist/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: fullName.trim(),
          title: title.trim(),
          bio_short: bioShort.trim(),
          bio_long: bioLong.trim(),
          religion,
          age_range: ageRange,
          years_of_experience: typeof yearsOfExperience === "number" ? yearsOfExperience : Number(yearsOfExperience || 0),
          languages: languages
            .split(/[,;]|\band\b/i)
            .map((s) => s.trim())
            .filter(Boolean),
          interests,
          session_price_45_min: typeof price45 === "number" ? price45 : Number(price45 || 0),
          profile_image_url: profileImageUrl,
          gender,
          lgbtq_friendly: lgbtqFriendly,
          locations: selectedLocations,
          accept_tos: acceptTos,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const errorMsg = data?.error || "Failed to save profile"
        console.error("[Profile Save Error]", errorMsg, data)

        toast({
          title: "Failed to save profile",
          description: errorMsg,
          variant: "destructive"
        })
        return
      }

      // Success!
      toast({
        title: "Success!",
        description: "Your profile has been created successfully",
      })

      setStep(2)
      setTimeout(() => router.replace("/dashboard"), 1500)
    } catch (err: any) {
      console.error("[Unexpected Error]", err)
      toast({
        title: "An error occurred",
        description: err.message || "Please try again",
        variant: "destructive"
      })
    } finally {
      setSavingProfile(false)
    }
  }, [fullName, title, bioShort, bioLong, religion, ageRange, yearsOfExperience, languages, price45, profileImageFile, acceptTos, supabase, router, gender, lgbtqFriendly, selectedLocations, interests, toast])

  if (hydrating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#056DBA]" />
          <p className="text-gray-600">Preparing your account...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-blue-100/20 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-[#056DBA]">Welcome to LinkTherapy</h1>
          <p className="text-gray-600">Complete your professional profile to start connecting with clients</p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className={`h-2 w-20 rounded-full transition-colors ${step >= 1 ? 'bg-[#056DBA]' : 'bg-gray-200'}`} />
            <div className={`h-2 w-20 rounded-full transition-colors ${step >= 2 ? 'bg-[#056DBA]' : 'bg-gray-200'}`} />
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-[#056DBA]">Basic Information</CardTitle>
                <CardDescription>Tell us about yourself</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div id="fullName">
                    <Label htmlFor="fullName-input" className="required">Full Name *</Label>
                    <Input
                      id="fullName-input"
                      placeholder="Dr. John Smith"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value)
                        setErrors(prev => ({ ...prev, fullName: "" }))
                      }}
                      className={errors.fullName ? "border-red-500" : ""}
                    />
                    {errors.fullName && <p className="text-sm text-red-500 mt-1">{errors.fullName}</p>}
                  </div>
                  <div id="title">
                    <Label htmlFor="title-input">Professional Title *</Label>
                    <Input
                      id="title-input"
                      placeholder="Clinical Psychologist"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value)
                        setErrors(prev => ({ ...prev, title: "" }))
                      }}
                      className={errors.title ? "border-red-500" : ""}
                    />
                    {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title}</p>}
                  </div>
                </div>

                <div id="bioShort">
                  <Label htmlFor="bioShort-input">Short Bio * <span className="text-xs text-gray-500">({bioShort.length}/150)</span></Label>
                  <Input
                    id="bioShort-input"
                    placeholder="One compelling sentence about you"
                    value={bioShort}
                    onChange={(e) => {
                      setBioShort(e.target.value)
                      setErrors(prev => ({ ...prev, bioShort: "" }))
                    }}
                    maxLength={150}
                    className={errors.bioShort ? "border-red-500" : ""}
                  />
                  {errors.bioShort && <p className="text-sm text-red-500 mt-1">{errors.bioShort}</p>}
                </div>

                <div id="bioLong">
                  <Label htmlFor="bioLong-input">Full Bio * <span className="text-xs text-gray-500">(Min 100 characters, {bioLong.length} written)</span></Label>
                  <Textarea
                    id="bioLong-input"
                    rows={6}
                    placeholder="Describe your approach, expertise, and what makes you unique..."
                    value={bioLong}
                    onChange={(e) => {
                      setBioLong(e.target.value)
                      setErrors(prev => ({ ...prev, bioLong: "" }))
                    }}
                    className={errors.bioLong ? "border-red-500" : ""}
                  />
                  {errors.bioLong && <p className="text-sm text-red-500 mt-1">{errors.bioLong}</p>}
                </div>
              </CardContent>
            </Card>

            {/* Demographics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-[#056DBA]">Demographics</CardTitle>
                <CardDescription>Help clients find the right match</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div id="gender">
                    <Label>Gender *</Label>
                    <Select value={gender} onValueChange={(v) => {
                      setGender(v as any)
                      setErrors(prev => ({ ...prev, gender: "" }))
                    }}>
                      <SelectTrigger className={errors.gender ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other / Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.gender && <p className="text-sm text-red-500 mt-1">{errors.gender}</p>}
                  </div>

                  <div id="ageRange">
                    <Label>Age Range *</Label>
                    <Select value={ageRange} onValueChange={(v) => {
                      setAgeRange(v)
                      setErrors(prev => ({ ...prev, ageRange: "" }))
                    }}>
                      <SelectTrigger className={errors.ageRange ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select age range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="21-28">21-28</SelectItem>
                        <SelectItem value="29-36">29-36</SelectItem>
                        <SelectItem value="37-45">37-45</SelectItem>
                        <SelectItem value="46-55">46-55</SelectItem>
                        <SelectItem value="55+">55+</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.ageRange && <p className="text-sm text-red-500 mt-1">{errors.ageRange}</p>}
                  </div>

                  <div id="religion">
                    <Label>Religion *</Label>
                    <Select value={religion} onValueChange={(v) => {
                      setReligion(v)
                      setErrors(prev => ({ ...prev, religion: "" }))
                    }}>
                      <SelectTrigger className={errors.religion ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select religion" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Christian">Christian</SelectItem>
                        <SelectItem value="Druze">Druze</SelectItem>
                        <SelectItem value="Sunni">Sunni</SelectItem>
                        <SelectItem value="Shiite">Shiite</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.religion && <p className="text-sm text-red-500 mt-1">{errors.religion}</p>}
                  </div>

                  <div id="yearsOfExperience">
                    <Label htmlFor="years-input">Years of Experience *</Label>
                    <Input
                      id="years-input"
                      type="number"
                      min="0"
                      placeholder="5"
                      value={yearsOfExperience}
                      onChange={(e) => {
                        setYearsOfExperience(e.target.value === "" ? "" : Number(e.target.value))
                        setErrors(prev => ({ ...prev, yearsOfExperience: "" }))
                      }}
                      className={errors.yearsOfExperience ? "border-red-500" : ""}
                    />
                    {errors.yearsOfExperience && <p className="text-sm text-red-500 mt-1">{errors.yearsOfExperience}</p>}
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-[#056DBA] transition-colors">
                    <input
                      type="checkbox"
                      checked={lgbtqFriendly}
                      onChange={(e) => setLgbtqFriendly(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    I have LGBTQ+ related experience
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Professional Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-[#056DBA]">Professional Details</CardTitle>
                <CardDescription>Your expertise and specializations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div id="languages">
                  <Label htmlFor="languages-input">Languages *</Label>
                  <Input
                    id="languages-input"
                    placeholder="Arabic, English, French"
                    value={languages}
                    onChange={(e) => {
                      setLanguages(e.target.value)
                      setErrors(prev => ({ ...prev, languages: "" }))
                    }}
                    className={errors.languages ? "border-red-500" : ""}
                  />
                  <p className="text-xs text-gray-500 mt-1">Separate with commas, semicolons, or &quot;and&quot;</p>
                  {errors.languages && <p className="text-sm text-red-500 mt-1">{errors.languages}</p>}
                </div>

                <div id="interests">
                  <Label>Interests & Specializations *</Label>
                  <div className="flex flex-wrap gap-2 mb-2 mt-1 min-h-[42px] p-2 border rounded-md">
                    {interests.length === 0 && (
                      <span className="text-sm text-gray-400">Add your specializations (e.g., Anxiety, CBT, Trauma)</span>
                    )}
                    {interests.map((it, idx) => (
                      <span key={`${it}-${idx}`} className="inline-flex items-center gap-1 bg-[#056DBA]/10 text-[#056DBA] border border-[#056DBA]/20 rounded-full px-3 py-1 text-sm">
                        {it}
                        <button
                          type="button"
                          onClick={() => setInterests((prev) => prev.filter((_, i) => i !== idx))}
                          className="hover:text-[#056DBA]/80"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Type and press Enter"
                      value={interestsInput}
                      onChange={(e) => setInterestsInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const val = interestsInput.trim()
                          const exists = interests.some((i) => i.toLowerCase() === val.toLowerCase())
                          if (val && !exists) {
                            setInterests((prev) => [...prev, val])
                            setErrors(prev => ({ ...prev, interests: "" }))
                          }
                          setInterestsInput("")
                        }
                      }}
                      className={errors.interests ? "border-red-500" : ""}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const val = interestsInput.trim()
                        const exists = interests.some((i) => i.toLowerCase() === val.toLowerCase())
                        if (val && !exists) {
                          setInterests((prev) => [...prev, val])
                          setErrors(prev => ({ ...prev, interests: "" }))
                        }
                        setInterestsInput("")
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">First 3 will appear on your profile card. Order matters!</p>
                  {errors.interests && <p className="text-sm text-red-500 mt-1">{errors.interests}</p>}
                </div>

                <div id="price45">
                  <Label htmlFor="price45-input">45-min Session Price (USD) *</Label>
                  <Input
                    id="price45-input"
                    type="number"
                    min="0"
                    placeholder="90"
                    value={price45}
                    onChange={(e) => {
                      setPrice45(e.target.value === "" ? "" : Number(e.target.value))
                      setErrors(prev => ({ ...prev, price45: "" }))
                    }}
                    className={errors.price45 ? "border-red-500" : ""}
                  />
                  {errors.price45 && <p className="text-sm text-red-500 mt-1">{errors.price45}</p>}
                </div>
              </CardContent>
            </Card>

            {/* Locations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-[#056DBA]">Service Locations</CardTitle>
                <CardDescription>Where do you see clients? (Select up to 2)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4" id="locations">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {availableCities.map((city) => (
                    <label
                      key={city}
                      className={`flex items-center gap-2 text-sm p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedLocations.includes(city)
                          ? 'border-[#056DBA] bg-[#056DBA]/5'
                          : 'border-gray-200 hover:border-[#056DBA]/30'
                      } ${!selectedLocations.includes(city) && selectedLocations.length >= 2 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedLocations.includes(city)}
                        disabled={!selectedLocations.includes(city) && selectedLocations.length >= 2}
                        onChange={(e) => {
                          const checked = e.target.checked
                          setSelectedLocations((prev) =>
                            checked
                              ? Array.from(new Set([...prev, city])).slice(0, 2)
                              : prev.filter((c) => c !== city)
                          )
                          setErrors(prev => ({ ...prev, locations: "" }))
                        }}
                        className="rounded border-gray-300"
                      />
                      {city}
                    </label>
                  ))}
                </div>

                <div>
                  <Label htmlFor="locationInput">Add Custom City</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="locationInput"
                      placeholder="Type a city name"
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      disabled={selectedLocations.length >= 2}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const val = locationInput.trim()
                          if (val && !selectedLocations.includes(val) && selectedLocations.length < 2) {
                            setSelectedLocations((prev) => [...prev, val])
                            setErrors(prev => ({ ...prev, locations: "" }))
                          }
                          setLocationInput("")
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={selectedLocations.length >= 2}
                      onClick={() => {
                        const val = locationInput.trim()
                        if (val && !selectedLocations.includes(val) && selectedLocations.length < 2) {
                          setSelectedLocations((prev) => [...prev, val])
                          setErrors(prev => ({ ...prev, locations: "" }))
                        }
                        setLocationInput("")
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>

                {selectedLocations.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedLocations.map((loc) => (
                      <span key={loc} className="inline-flex items-center gap-1 bg-[#36A72B]/10 text-[#36A72B] border border-[#36A72B]/20 rounded-full px-3 py-1 text-sm">
                        {loc}
                        <button
                          type="button"
                          onClick={() => setSelectedLocations((prev) => prev.filter((c) => c !== loc))}
                          className="hover:text-[#36A72B]/80"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {selectedLocations.length >= 2 && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Maximum 2 locations selected
                  </p>
                )}
                {errors.locations && <p className="text-sm text-red-500 mt-1">{errors.locations}</p>}
              </CardContent>
            </Card>

            {/* Profile Image */}
            <Card>
              <CardHeader>
                <CardTitle className="text-[#056DBA]">Profile Image</CardTitle>
                <CardDescription>Upload a professional photo (optional, max 5MB)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {profileImagePreview && (
                  <div className="flex justify-center">
                    <div className="relative">
                      <img
                        src={profileImagePreview}
                        alt="Profile preview"
                        className="w-32 h-32 rounded-full object-cover border-4 border-[#056DBA]/20"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setProfileImageFile(null)
                          setProfileImagePreview("")
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-gray-500" />
                      <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                      <p className="text-xs text-gray-500">PNG, JPG (MAX. 5MB)</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Terms & Submit */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div id="acceptTos" className={`p-4 rounded-lg ${errors.acceptTos ? 'bg-red-50 border-2 border-red-200' : 'bg-gray-50'}`}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptTos}
                      onChange={(e) => {
                        setAcceptTos(e.target.checked)
                        setErrors(prev => ({ ...prev, acceptTos: "" }))
                      }}
                      className="mt-1 rounded border-gray-300"
                    />
                    <span className="text-sm">
                      I agree to the <a href="/terms" target="_blank" className="text-[#056DBA] underline">Terms of Service</a> and <a href="/privacy" target="_blank" className="text-[#056DBA] underline">Privacy Policy</a>
                    </span>
                  </label>
                  {errors.acceptTos && <p className="text-sm text-red-500 mt-2 ml-7">{errors.acceptTos}</p>}
                </div>

                <Button
                  onClick={onSaveProfile}
                  disabled={savingProfile || uploadingImage}
                  className="w-full bg-[#056DBA] hover:bg-[#056DBA]/90 text-white py-6 text-lg"
                >
                  {savingProfile ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {uploadingImage ? "Uploading image..." : "Saving profile..."}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      Complete Onboarding
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 2 && (
          <Card>
            <CardContent className="text-center py-12 space-y-4">
              <div className="flex justify-center">
                <div className="bg-green-100 p-4 rounded-full">
                  <CheckCircle2 className="h-12 w-12 text-green-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-green-700">All Set!</h2>
              <p className="text-gray-600">Your profile has been created successfully</p>
              <p className="text-sm text-gray-500">Redirecting to your dashboard...</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
